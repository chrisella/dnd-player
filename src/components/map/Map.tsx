import React, { Component, ReactNode, ReactElement } from 'react';
import { Stage, Sprite, AppConsumer, Graphics } from '@inlet/react-pixi';
import * as PIXI from 'pixi.js';
import { v4 } from 'uuid';

import { MapData, MapObject, MapLayer as MapLayerModel } from '../../models/Map';

import { DropTarget, DropTargetMonitor } from 'react-dnd';
import types from '../../constants/dragdroptypes';

import { Upload } from '../../models/Upload';
import { LinearProgress } from '@material-ui/core';
import { groupObjectsByLayer, calculateDistance, GroupedMapObject } from './MapUtils';
import { PlayerCharacter, NonPlayerCharacter } from '../../5e/models/Character';
import Ruler from './objects/Ruler';
import BasicFogLayer from './BasicFogLayer';

import styles from './Map.module.scss';
import { ViewportComponent } from './Viewport';
import { MapPing } from '../../models/MapPing';
import Ping from './objects/OldPing';
import EditablePolygon from './objects/editable/EditablePolygon';
import { User } from '../../models/User';
import MapLayer from './MapLayer';

// import Ping from './objects/NewPing';

interface CollectProps {
	connectDropTarget: any;
	itemType: typeof types;
	isHovering: boolean;
}

interface OwnProps {
	updateSpriteLocation: (sprite: Sprite) => void;
	mapData?: MapData;
	selectedObjects: string[];
	playerCharacters: PlayerCharacter[];
	nonPlayerCharacters: NonPlayerCharacter[];
	onUpdateObject: (mapId, mapObjectId, newData) => void;
	onAddAssetToMap: (mapId, assetType, assetId, initialData) => void;
	onAddImageToMap: (mapId, imageRef, initialData) => void;
	onSelectObject: (mapObjectId) => void;
	onSelectObjects: (mapObjectIds: string[]) => void;
	images: Upload[];
	dm: boolean;
	user: firebase.User;
	users: { [key: string]: User };
	sendPing: (ping: MapPing) => void;
	mapPings: { [key: string]: MapPing };
	keyShiftDown: boolean;
	toggleMeasureMode: (val?: boolean) => void;
	measureModeEnabled: boolean;
	fogEditMode: boolean;
	fogAddMode: boolean;
	userColour: number;
	onUpdateFogPolygon: (
		mapId: string,
		fogPolygonId: string,
		position: PIXI.Point,
		points?: number[]
	) => void;
}

type Props = CollectProps & OwnProps;

interface State {
	windowWidth: number;
	windowHeight: number;
	loadingAssets: boolean;
	loadProgress: number;
	app?: PIXI.Application;
	measuring: boolean;
	measureStart: PIXI.PointLike;
	measureEnd: PIXI.PointLike;
	measuredDistance: string; // Probably should be a number ultimately
	viewportZoom: number;
	newFogIndex?: string;
	newFogPosition?: PIXI.PointLike;
	newFogPoints?: number[];
	boxSelectStart?: PIXI.PointLike;
	boxSelectEnd?: PIXI.PointLike;
}
class Map extends Component<Props, State> {
	state = {
		windowWidth: window.innerWidth,
		windowHeight: window.innerHeight,
		loadingAssets: true,
		loadProgress: 0,
		app: null,
		measuring: false,
		measureStart: null,
		measureEnd: null,
		measuredDistance: null,
		viewportZoom: 1,
		newFogIndex: null,
		newFogPosition: null,
		newFogPoints: null,
		boxSelectStart: null,
		boxSelectEnd: null
	};

	private app: any;
	private root: PIXI.Container;

	public _viewport: Viewport;
	private _stage: any;
	private _mainWrapper: HTMLElement;

	private loader: PIXI.Loader = PIXI.loader;

	componentDidMount() {
		this.loadAssets(this.props, this.state, true);

		window.addEventListener('resize', this.handleWindowResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.handleWindowResize);
	}

	componentDidUpdate(prevProps: Props, prevState: State): void {
		this.loadAssets(prevProps, prevState, false);

		if (this.props.measureModeEnabled !== prevProps.measureModeEnabled) {
			this.setState({
				measuring: this.props.measureModeEnabled
			});
		}

		if (this.props.dm && (this.props.fogAddMode && !prevProps.fogAddMode)) {
			// Fog add enabled, prepare some local state.
			this.setState({
				newFogIndex: v4(),
				newFogPosition: new PIXI.Point(0, 0),
				newFogPoints: []
			});
		}
		if (this.props.dm && (!this.props.fogAddMode && prevProps.fogAddMode)) {
			// Fog add disabled, cleanup local state and persist the new poly ?
			if (this.state.newFogPoints.length >= 4) {
				// Minimum of 2 points (4 nums) to create a fog poly
				this.props.onUpdateFogPolygon(
					this.props.mapData.id,
					this.state.newFogIndex,
					this.state.newFogPosition,
					this.state.newFogPoints
				);
			}

			this.setState({
				newFogIndex: null,
				newFogPosition: null,
				newFogPoints: null
			});
		}
	}

	handleWindowResize = () => {
		this.setState({
			windowWidth: window.innerWidth,
			windowHeight: window.innerHeight
		});
	};

	loadAssets = (prevProps: Props, prevState: State, forceLoad: boolean): void => {
		if (prevState.loadingAssets && !this.state.loadingAssets) {
			if (this._viewport) {
				this._viewport.fitWorld();
			}
		}

		if (
			forceLoad ||
			(this.props.mapData && !prevProps.mapData) ||
			(this.props.mapData && this.props.mapData.objects !== prevProps.mapData.objects)
		) {
			if (!this.loader.resources['__missing__']) {
				this.loader.add('__missing__', 'https://placekitten.com/128/128');
			}

			const mapAssetsToLoad = Object.keys(this.props.mapData.objects || {})
				.map(
					(x: string): any => {
						// TODO: CE - Really not loving this code to determine the image ref, revisit this
						const o = this.props.mapData.objects[x];
						const pc = o.pcId
							? this.props.playerCharacters.find(y => y.id === o.pcId)
							: null;
						const npc = o.npcId
							? this.props.nonPlayerCharacters.find(x => x.id === o.npcId)
							: null;
						const imgRef =
							o && o.imageRef
								? o.imageRef
								: pc
								? pc.imageRef
								: npc
								? npc.imageRef || '__missing__'
								: '__missing__';
						const alreadyExists = !!this.loader.resources[imgRef];
						if (alreadyExists) return null;
						const img = this.props.images.find(y => y.filePath === imgRef);
						if (!img) {
							// This could be a remote image
						}

						return {
							name: imgRef,
							url: img ? img.downloadUrl : imgRef,
							loadType: 2 //PIXI.loaders.LOAD_TYPE.IMAGE
						};
					}
				)
				.filter(x => x);

			const distinctAssetsToLoad = Array.from(new Set(mapAssetsToLoad.map(x => x.name))).map(
				name => {
					return {
						...mapAssetsToLoad.find(x => x.name === name)
					};
				}
			);

			this.loader.add(distinctAssetsToLoad);
			this.loader.load(
				(): void => {
					this.setState({ loadingAssets: false });
				}
			);

			this.loader.onProgress.add(x => this.setState({ loadProgress: x.progress }));
		}
	};

	onMapMount = (app: PIXI.Application): void => {
		this.setState({ app: app });
		// app.stage.hitArea = new PIXI.Rectangle(
		// 	0,
		// 	0,
		// 	app.renderer.width / app.renderer.resolution,
		// 	app.renderer.height / app.renderer.resolution
		// );
		app.stage.interactive = true;
		// Any free space click should de-select the currently selected object.
		// for this to work any objects on the stage the implement .on('mouseup')
		// need to ensure they call e.stopPropagation(); or the event will also get here!
		app.stage.on(
			'mousedown',
			(e): void => {
				// console.log(e);
				if (e.target.name !== this._viewport.name) {
					return;
				}
				if (
					!this.state.measuring &&
					this.props.onSelectObject &&
					this.props.selectedObjects.length > 0
				) {
					this.props.onSelectObject(null);
				}

				if (this.state.measuring) {
					this.setState({
						measureStart: e.data.global.clone(),
						measureEnd: e.data.global.clone(),
						measuredDistance: '0'
					});
				}

				if (this.props.dm && this.props.fogAddMode) {
					const localPos = this._viewport.toLocal(e.data.global);
					//console.log(`TODO: Add new poly point @ ${localPos.x}, ${localPos.y}`);

					let newFogPos = this.state.newFogPosition;
					if (
						!this.state.newFogPosition ||
						(this.state.newFogPosition.x === 0 && this.state.newFogPosition.y === 0)
					) {
						this.setState({
							newFogPosition: localPos.clone()
						});

						newFogPos = localPos.clone();
					}

					// Make all new points offset from the first
					const newPointPos = new PIXI.Point(
						localPos.x - newFogPos.x,
						localPos.y - newFogPos.y
					);

					this.setState(state => ({
						newFogPoints: [...state.newFogPoints, newPointPos.x, newPointPos.y]
					}));
				}

				// WIP Ping testing
				if (!this.state.measuring && !this.props.fogAddMode && this.props.keyShiftDown) {
					const localPos = this._viewport.toLocal(e.data.global);
					this.props.sendPing({
						position: localPos.clone(),
						userId: this.props.user.uid
					});
				}

				if (!this.state.measuring && !this.props.fogAddMode && !this.props.fogEditMode) {
					const localPos = this._viewport.toLocal(e.data.global);
					this.setState({
						boxSelectStart: localPos.clone()
					});
				}
			}
		);
		app.stage.on(
			'mousemove',
			(e): void => {
				if (this.state.measuring && this.state.measureStart) {
					this.setState({
						measureEnd: e.data.global.clone(),
						measuredDistance: `${calculateDistance(
							[this.state.measureStart.x, this.state.measureStart.y],
							[this.state.measureEnd.x, this.state.measureEnd.y],
							this._viewport.scale.x
						)} ft.`
					});
				}

				if (!this.state.measuring && !this.props.fogAddMode && !this.props.fogEditMode) {
					const localPos = this._viewport.toLocal(e.data.global);
					this.setState({
						boxSelectEnd: localPos.clone()
					});
				}
			}
		);
		app.stage.on(
			'mouseup',
			(e): void => {
				if (this.state.measuring) {
					this.setState({ measureStart: null, measureEnd: null, measuredDistance: null });
				}

				if (this.state.boxSelectStart && this.state.boxSelectEnd) {
					// TODO: Calculate box select before resetting to null
					//       doing this efficiently would be nice but not sure there is a way
					//       that isn't just checking every object, it's not like we have an Octree or
					//       something :(

					const dragRect = new PIXI.Rectangle(
						this.state.boxSelectStart.x,
						this.state.boxSelectStart.y,
						this.state.boxSelectEnd.x - this.state.boxSelectStart.x,
						this.state.boxSelectEnd.y - this.state.boxSelectStart.y
					);

					const selectedObjects = Object.keys(this.props.mapData.objects).filter(
						(x): boolean => {
							const o: MapObject = this.props.mapData.objects[x];
							const layers = this.props.mapData.layers;

							const layer = layers.hasOwnProperty(o.layer)
								? (layers[o.layer] as MapLayerModel)
								: null;
							if (layer && layer.locked) {
								return false;
							}

							return dragRect.contains(o.position.x, o.position.y);
						}
					);

					this.props.onSelectObjects(selectedObjects);

					// console.log(
					// 	`Box Select (${this.state.boxSelectStart.x}, ${
					// 		this.state.boxSelectStart.y
					// 	}) -> (${this.state.boxSelectEnd.x}, ${this.state.boxSelectEnd.y})`
					// );
					// console.log(selectedObjects);
				}

				this.setState({ boxSelectStart: null, boxSelectEnd: null });
			}
		);
	};

	handleMultiDrag = (dX, dY, sourceMapObjectId): void => {
		console.log(`${sourceMapObjectId} - ${dX},${dY}`);

		if (this.props.selectedObjects && this.props.selectedObjects.length > 1) {
			const otherObjects: MapObject[] = this.props.selectedObjects
				.filter(x => x !== sourceMapObjectId)
				.map(
					(x): any => ({
						...this.props.mapData.objects[x],
						id: x
					})
				);

			// TODO: This isn't correct because dX & dY are offsets from the drag start,
			// so this keeps adding the value over and over to the position.
			// Either dX & dY should be between each frame OR this needs to somehow
			// store the start drag pos here also.
			otherObjects.forEach(x => {
				this.props.onUpdateObject(this.props.mapData.id, x.id, {
					position: { x: x.position.x + dX, y: x.position.y + dY }
				});
			});
		}
	};

	render(): ReactNode {
		if (this.state.loadingAssets) {
			return (
				<div className={styles.loadingWrapper}>
					<div className={styles.loadingText}>LOADING...</div>
					<LinearProgress variant="determinate" value={this.state.loadProgress} />
				</div>
			);
		}

		if (!this.props.mapData) {
			return (
				<div className={styles.noMapWrapper}>
					<div className={styles.noMapText}>No Map</div>
				</div>
			);
		}

		const { backgroundColour } = this.props.mapData;
		const { dm } = this.props;

		const { connectDropTarget, isHovering } = this.props;

		let overlay = null;
		if (isHovering) {
			overlay = (
				<div className={styles.dragAddObjectWrapper}>
					<div className={styles.dragAddObjectText}>+</div>
				</div>
			);
		}

		// TODO: Order this (maybe make it an array not an object) so layer zIndex is obeyed.
		const groupedObjects = groupObjectsByLayer(this.props.mapData);
		const layerSortFunc = (a: GroupedMapObject, b: GroupedMapObject) => a.zIndex - b.zIndex;

		return connectDropTarget(
			<div ref={c => (this._mainWrapper = c)}>
				{overlay}
				<div className={styles.controlStateOverlay}>
					{this.props.measureModeEnabled && (
						<span className={styles.controlState}>MEASURING MODE</span>
					)}
					{this.props.dm && this.props.fogEditMode && (
						<span className={styles.controlState}>FOG EDIT MODE</span>
					)}
					{this.props.dm && this.props.fogAddMode && (
						<span className={styles.controlState}>FOG ADD MODE</span>
					)}
				</div>
				<Stage
					ref={c => (this._stage = c as any)}
					onMount={this.onMapMount}
					width={this.state.windowWidth}
					height={this.state.windowHeight}
					options={{
						antialias: true,
						backgroundColor: backgroundColour
							? parseInt(backgroundColour.slice(1), 16)
							: 0xffffff
					}}
				>
					<AppConsumer>
						{(app): ReactNode => (
							<ViewportComponent
								name="viewport"
								ref={c => (this._viewport = c as any)}
								app={app}
								screenWidth={this.state.windowWidth}
								screenHeight={this.state.windowHeight}
								onZoom={x => this.setState({ viewportZoom: x })}
							>
								{groupedObjects.sort(layerSortFunc).map(
									(layer: GroupedMapObject): ReactNode => (
										<MapLayer
											key={layer.name}
											dm={dm}
											fogAddMode={this.props.fogAddMode}
											handleMultiDrag={this.handleMultiDrag}
											keyShiftDown={this.props.keyShiftDown}
											layer={layer}
											map={this.props.mapData}
											measuring={this.state.measuring}
											playerCharacters={this.props.playerCharacters}
											nonPlayerCharacters={this.props.nonPlayerCharacters}
											onSelectObject={this.props.onSelectObject}
											selectedObjects={this.props.selectedObjects}
											onUpdateObject={this.props.onUpdateObject}
											viewportZoom={this.state.viewportZoom}
										/>
									)
								)}
								<BasicFogLayer
									fogData={this.props.mapData && this.props.mapData.fog}
									dm={dm}
									editing={this.props.fogEditMode}
									viewportZoom={this.state.viewportZoom}
								/>
								{dm &&
									this.props.fogEditMode &&
									this.props.mapData &&
									Object.keys(this.props.mapData.fog.maskPolygons).length > 0 &&
									Object.keys(this.props.mapData.fog.maskPolygons).map(
										(xx, idx): ReactElement => {
											const x = this.props.mapData.fog.maskPolygons[xx];
											return (
												<EditablePolygon
													key={xx}
													onUpdate={(position, points): void => {
														this.props.onUpdateFogPolygon(
															this.props.mapData.id,
															xx,
															position,
															points
														);
													}}
													position={
														new PIXI.Point(x.position.x, x.position.y)
													}
													editMode={this.props.fogEditMode}
													polyPoints={x.points}
													viewportZoom={this.state.viewportZoom}
												/>
											);
										}
									)}
								<Ruler
									visible={this.state.measuring}
									measuring={this.state.measuring}
									start={this.state.measureStart}
									end={this.state.measureEnd}
									distance={this.state.measuredDistance}
									scale={this._viewport ? 1 / this._viewport.scale.x : 1}
									thickness={3}
								/>
								{Object.keys(this.props.mapPings).map(
									(x): ReactElement => {
										const p: MapPing = this.props.mapPings[x];
										const sourceUser = this.props.users[p.userId];
										return (
											<Ping
												key={x}
												colour={sourceUser ? sourceUser.colour : 0xff0000}
												position={
													new PIXI.Point(p.position.x, p.position.y)
												}
												viewportZoom={this.state.viewportZoom}
											/>
										);
									}
								)}
								{this.state.boxSelectStart && this.state.boxSelectEnd && (
									<Graphics
										draw={(g): void => {
											g.clear();
											g.lineStyle(
												5.2 * (1 / this.state.viewportZoom),
												0xff0000,
												0.7,
												0.5
											);
											g.drawRect(
												this.state.boxSelectStart.x,
												this.state.boxSelectStart.y,
												this.state.boxSelectEnd.x -
													this.state.boxSelectStart.x,
												this.state.boxSelectEnd.y -
													this.state.boxSelectStart.y
											);
										}}
									/>
								)}
							</ViewportComponent>
						)}
					</AppConsumer>
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
	drop(props: Props, monitor: DropTargetMonitor, component: Map) {
		const item = monitor.getItem();
		const type = monitor.getItemType();
		// console.log(`dropped [DROPPER]:`);
		// console.log(item);

		const dropPos = monitor.getClientOffset();
		const localCoords = component._viewport.toLocal(new PIXI.Point(dropPos.x, dropPos.y));

		// console.log(`Drop World coords: ${JSON.stringify(localCoords)}`);

		switch (type) {
			case types.PLAYER_CHARACTER_ASSET:
				if (props.onAddAssetToMap && props.mapData) {
					const initialData: any = {
						position: { x: localCoords.x, y: localCoords.y }
					};
					if (item.assetType === 1) {
						const asset = props.nonPlayerCharacters.find(x => x.id === item.id);
						if (asset.hpDice) {
							const { DiceRoll } = require('rpg-dice-roller');
							const roll = Math.max(
								new DiceRoll(asset.hpDice.replace(/ /g, '')).total,
								1
							);

							initialData.hp = { value: roll, max: roll };
						}
					}
					props.onAddAssetToMap(props.mapData.id, item.assetType, item.id, initialData);
				}
				break;
			case types.UPLOAD_IMAGE:
				if (props.onAddImageToMap && props.mapData) {
					props.onAddImageToMap(props.mapData.id, item.imageRef, {
						position: { x: localCoords.x, y: localCoords.y }
					});
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
)(Map);
