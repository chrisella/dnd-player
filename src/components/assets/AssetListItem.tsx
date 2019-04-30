import React, { Component, ReactNode } from 'react';
import { AssetType } from '../../models/AssetType';

import css from './AssetListItem.module.css';
import AssetListImage from './AssetListImage';
import { Upload } from '../../models/Upload';

interface Props {
	asset: any;
	assetType: AssetType;
	images: Upload[];
	openCharacterSheet: (characterId: string) => void;
}

export default class AssetListItem extends Component<Props, {}> {
	render(): ReactNode {
		const { asset, assetType } = this.props;
		return (
			<div className={css.item}>
				<AssetListImage {...this.props} />
				<div className={css.title} onClick={() => this.onClick(asset)}>
					{asset.name || 'unknown'}
				</div>
			</div>
		);
	}

	onClick(asset): void {
		this.props.openCharacterSheet(asset.id);
	}
}
