import React, { Component } from 'react';

interface Props {
	asset: any;
}
export default class UploadListItem extends Component<Props> {
	render() {
		const { asset } = this.props;
		return <div>{asset.name || 'unknown'}</div>;
	}
}
