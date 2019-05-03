import React, { Component, ReactNode, ReactElement } from 'react';
import { Stage, Sprite, Container, PixiComponent } from '@inlet/react-pixi';
import * as PIXI from 'pixi.js';
import Viewport from 'pixi-viewport';

import { MapData } from '../../models/Map';

import { DropTarget, DropTargetMonitor } from 'react-dnd';
import types from '../../constants/dragdroptypes';

import TESTDATA from './testMap.json';
import { PlayerCharacterData, NonPlayerCharacterData } from '../../models/Asset';
import Token from './objects/Token';
import { Upload } from '../../models/Upload';
import { withStyles, WithStyles, LinearProgress } from '@material-ui/core';
import Scenery from './objects/Scenery';
import { groupObjectsByLayer } from './MapUtils';

const ViewportComponent = PixiComponent('Viewport', {
	create: props => {
		const v = new Viewport({
			screenWidth: window.innerWidth * 0.75,
			screenHeight: window.innerHeight,
			worldWidth: 1000,
			worldHeight: 1000

			// !TODO: This line is important and needed BUT we don't have app here!
			//interaction: app.renderer.plugins.interaction
		});

		v.drag({
			mouseButtons: 'right'
		})
			.pinch()
			.wheel()
			.decelerate();

		return v;
	}
});

const styles = theme => ({
	loadingWrapper: {
		position: 'absolute' as 'absolute', // Avoid type widening
		top: '50%',
		left: '50%',
		transform: 'translate(-50%, 0)'
	},
	loadingText: {
		fontSize: '200%'
	},
	dragAddObjectWrapper: {
		position: 'absolute' as 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		background: 'rgba(0,0,0,0.4)'
	},
	dragAddObjectText: {
		position: 'absolute' as 'absolute',
		top: '50%',
		left: '50%',
		color: 'white',
		transform: 'translate(-50%, -50%)',
		fontSize: 120
	}
});

interface CollectProps {
	connectDropTarget: any;
	itemType: typeof types;
	isHovering: boolean;
}

interface OwnProps extends WithStyles<typeof styles> {
	updateSpriteLocation: (sprite: Sprite) => void;
	mapData?: MapData;
	zoom?: number;
	selectedObjects: string[];
	// testMap: any;
	playerCharacters: PlayerCharacterData[];
	nonPlayerCharacters: NonPlayerCharacterData[];
	onSelectObject: (data) => void;
	onUpdateObject: (data) => void;
	onAddAssetToMap: (data) => void;
	onAddImageToMap: (data) => void;
	images: Upload[];
}

type Props = CollectProps & OwnProps;

interface State {
	loadingAssets: boolean;
	loadProgress: number;
}
class Map extends Component<Props, State> {
	state = {
		loadingAssets: true,
		loadProgress: 0
	};

	private app: any;
	private root: PIXI.Container;

	private _viewport: Viewport;

	private loader: PIXI.loaders.Loader = PIXI.loader;

	componentDidUpdate(prevProps: Props, prevState: State): void {
		// This errors currently as it's run multiple times and tries to load the
		// same asset multiple times.

		if (prevState.loadingAssets && !this.state.loadingAssets) {
			if (this._viewport) {
				this._viewport.fitWorld();
			}
		}

		if (this.props.images != prevProps.images) {
			// TODO: Instead of loading ALL images EVERY time the props.images changes,
			//       only load those in use on this map
			// const loader = PIXI.loader;
			if (!this.loader.resources['__missing__']) {
				this.loader.add('__missing__', 'http://placekitten.com/128/128');
			}

			this.setState({ loadingAssets: true });

			const assetsToLoad = this.props.images
				.map(
					(x): any => {
						const alreadyExists = !!this.loader.resources[x.filePath];
						if (alreadyExists) return null;
						return {
							name: x.filePath,
							url: x.downloadUrl,
							loadType: 2 //PIXI.loaders.LOAD_TYPE.IMAGE
						};
					}
				)
				.filter((x): any => x); // Remove Nulls I.E. already loaded
			this.loader.add(assetsToLoad);
			this.loader.load(
				(): void => {
					this.setState({ loadingAssets: false });
				}
			);

			this.loader.onProgress.add(x => this.setState({ loadProgress: x.progress }));
		}
	}

	onMapMount = (app: PIXI.Application) => {
		app.stage.hitArea = new PIXI.Rectangle(
			0,
			0,
			app.renderer.width / app.renderer.resolution,
			app.renderer.height / app.renderer.resolution
		);
		app.stage.interactive = true;
		// Any free space click should de-select the currently selected object.
		// for this to work any objects on the stage the implement .on('mouseup')
		// need to ensure they call e.stopPropagation(); or the event will also get here!
		app.stage.on('mousedown', e => {
			// console.log(e);
			if (this.props.onSelectObject) {
				this.props.onSelectObject({ mapObjectId: null });
			}
		});
	};

	render(): ReactNode {
		const { classes, playerCharacters, nonPlayerCharacters, selectedObjects } = this.props;

		if (this.state.loadingAssets) {
			return (
				<div className={classes.loadingWrapper}>
					<div className={classes.loadingText}>LOADING...</div>
					<LinearProgress variant="determinate" value={this.state.loadProgress} />
				</div>
			);
		}

		if (!this.props.mapData) {
			return <div>No Map</div>;
		}

		const { objects } = this.props.mapData;
		const { background, tokens } = this.props.mapData.layers;

		const { connectDropTarget, isHovering } = this.props;

		let overlay = null;
		if (isHovering) {
			overlay = (
				<div className={classes.dragAddObjectWrapper}>
					<div className={classes.dragAddObjectText}>+</div>
				</div>
			);
		}

		// TODO: Order this (maybe make it an array not an object) so layer zIndex is obeyed.
		const groupedObjects = groupObjectsByLayer(this.props.mapData);
		// const layerSortFunc = (a, b) =>
		// 	groupedObjects[a].zIndex < groupedObjects[b].zIndex
		// 		? -1
		// 		: groupedObjects[a].zIndex > groupedObjects[b].zIndex
		// 			? 1
		// 		: 0;

		return connectDropTarget(
			<div>
				{overlay}
				<Stage
					onMount={this.onMapMount}
					width={window.innerWidth * 0.75}
					height={window.innerHeight}
					options={{
						antialias: true
						// backgroundColor: 0xffffff
					}}
				>
					<ViewportComponent ref={c => (this._viewport = c as any)}>
						{Object.keys(groupedObjects)
							// .sort(layerSortFunc)
							.map((layerName: string) => {
								const l = groupedObjects[layerName];
								return (
									<Container key={layerName} name={`layer-${layerName}`}>
										{l.map(o => {
											const isPc = !!o.pcId;
											const isNpc = !!o.npcId;
											const pcAsset = o.pcId
												? playerCharacters.find(x => x.id === o.pcId)
												: null;
											const npcAsset = o.npcId
												? nonPlayerCharacters.find(x => x.id === o.npcId)
												: null;
											const imageUrl =
												pcAsset && pcAsset.imageRef
													? pcAsset.imageRef
													: npcAsset && npcAsset.imageRef
													? npcAsset.imageRef
													: o.imageRef || '__missing__';
											const res = PIXI.loader.resources[imageUrl].texture;
											const isSelected = !!selectedObjects.find(
												x => x === o.id
											);
											const isToken = isPc || isNpc;
											return !isToken ? (
												<Scenery
													key={o.id}
													position={o.position}
													scale={o.scale}
													rotation={o.rotation}
													pivot={o.pivot}
													anchor={o.anchor}
													resource={res}
													onUpdateObject={this.props.onUpdateObject}
													isSelected={isSelected}
													isSelectable={true}
													onSelected={this.props.onSelectObject}
													mapObjectId={o.id}
													layerName="background"
												/>
											) : (
												<Token
													key={o.id}
													resource={res}
													hp={o.hp || { value: 30, max: 60 }}
													position={o.position}
													scale={o.scale}
													rotation={o.rotation}
													pivot={o.pivot}
													anchor={o.anchor}
													onUpdateObject={this.props.onUpdateObject}
													isSelected={isSelected}
													isSelectable={true}
													onSelected={this.props.onSelectObject}
													mapObjectId={o.id}
													layerName="tokens"
												/>
											);
										})}
									</Container>
								);
							})}
						{/* <Container name="layer-background">
							{Object.keys(background.mapObjects).map(
								(mapObjId): ReactElement => {
									const o = background.mapObjects[mapObjId];
									const pcAsset = o.pcId
										? playerCharacters.find(x => x.id === o.pcId)
										: null;
									const npcAsset = o.npcId
										? nonPlayerCharacters.find(x => x.id === o.npcId)
										: null;
									const imageUrl =
										pcAsset && pcAsset.imageRef
											? pcAsset.imageRef
											: npcAsset && npcAsset.imageRef
											? npcAsset.imageRef
											: o.imageRef || '__missing__';
									const res = PIXI.loader.resources[imageUrl].texture;
									const isSelected = !!selectedObjects.find(x => x === mapObjId);
									return (
										<Scenery
											key={mapObjId}
											position={o.position}
											scale={o.scale}
											rotation={o.rotation}
											pivot={o.pivot}
											anchor={o.anchor}
											resource={res}
											onUpdateObject={this.props.onUpdateObject}
											isSelected={isSelected}
											isSelectable={true}
											onSelected={this.props.onSelectObject}
											mapObjectId={mapObjId}
											layerName="background"
										/>
									);
								}
							)}
						</Container>
						<Container name="layer-tokens">
							{tokens &&
								tokens.mapObjects &&
								Object.keys(tokens.mapObjects).map(
									(mapObjId): ReactElement => {
										const o = tokens.mapObjects[mapObjId];
										const isPc = !!o.pcId;
										const isNpc = !!o.npcId;
										const pcAsset = isPc
											? playerCharacters.find(x => x.id === o.pcId)
											: null;
										const npcAsset = isNpc
											? nonPlayerCharacters.find(x => x.id === o.npcId)
											: null;
										const imageUrl =
											pcAsset && pcAsset.imageRef
												? pcAsset.imageRef
												: npcAsset && npcAsset.imageRef
												? npcAsset.imageRef
												: o.imageRef || '__missing__';
										const res = PIXI.loader.resources[imageUrl].texture;
										const isSelected = !!selectedObjects.find(
											x => x === mapObjId
										);
										return (
											<Token
												key={mapObjId}
												resource={res}
												hp={o.hp || { value: 30, max: 60 }}
												position={o.position}
												scale={o.scale}
												rotation={o.rotation}
												pivot={o.pivot}
												anchor={o.anchor}
												onUpdateObject={this.props.onUpdateObject}
												isSelected={isSelected}
												isSelectable={true}
												onSelected={this.props.onSelectObject}
												mapObjectId={mapObjId}
												layerName="tokens"
											/>
										);
									}
								)}
						</Container> */}
					</ViewportComponent>
				</Stage>
			</div>
		);
	}
}

const mapTargetSpec = {
	canDrop(props, monitor) {
		return true;
	},
	hover(props, monitor, component) {},
	drop(props, monitor: DropTargetMonitor, component) {
		const item = monitor.getItem();
		const type = monitor.getItemType();
		// console.log(`dropped [DROPPER]:`);
		// console.log(item);

		switch (type) {
			case types.PLAYER_CHARACTER_ASSET:
				if (props.onAddAssetToMap) {
					props.onAddAssetToMap({ assetType: item.assetType, assetId: item.id });
				}
				break;
			case types.UPLOAD_IMAGE:
				if (props.onAddImageToMap) {
					props.onAddImageToMap({ imageRef: item.imageRef });
				}
		}
	}
};

function collect(connect, monitor: DropTargetMonitor): CollectProps {
	return {
		connectDropTarget: connect.dropTarget(),
		itemType: monitor.getItemType() as any,
		isHovering: monitor.isOver()
	};
}

export default DropTarget(
	[types.PLAYER_CHARACTER_ASSET, types.UPLOAD_IMAGE],
	mapTargetSpec,
	collect
)(withStyles(styles)(Map));
