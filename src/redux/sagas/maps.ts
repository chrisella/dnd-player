import { all, fork, takeEvery, call } from 'redux-saga/effects';
import firebase from 'firebase/app';
import 'firebase/database';

import rsf from '../rsf';
import {
	mapsSyncSuccess,
	mapsSyncError,
	MapsUpdateBackgroundColourAction,
	types,
	MapsAddAssetAction,
	MapsAddImageAction,
	MapsUpdateObjectAction,
	MapsRemoveObjectAction,
	UpdateFogPolygonAction,
	UpdateFogColourAction,
	SetLayerLockedAction
} from '../actions/maps';
import { AssetType } from '../../models/AssetType';

const mapsTransformer = ({ value }) =>
	Object.keys(value).map(key => ({
		...value[key],
		id: key
	}));

function* syncMapsSaga(): any {
	yield fork(
		rsf.database.sync,
		firebase.database(rsf.app).ref('/maps'),
		{
			successActionCreator: mapsSyncSuccess,
			failureActionCreator: mapsSyncError,
			transform: mapsTransformer
		},
		'value'
	);
}

function* updateMapBackgroundColourSaga(action: MapsUpdateBackgroundColourAction): any {
	const { mapId, colour } = action;
	yield call(rsf.database.update, `/maps/${mapId}/backgroundColour`, colour);
}

function* addAssetToMap(action: MapsAddAssetAction): any {
	const { mapId, assetType, assetId, initialData } = action;
	let payload = {
		anchor: { x: 0.5, y: 0.5 },
		pivot: { x: 0.5, y: 0.5 },
		name: 'New Asset',
		position: { x: 0, y: 0 },
		rotation: 0,
		scale: { x: 1, y: 1 },
		layer: 'tokens',
		...(initialData || {}) // Override with initial data
	};
	if (assetType === AssetType.PlayerCharacter) {
		payload['pcId'] = assetId;
	} else if (assetType === AssetType.NonPlayerCharacter) {
		payload['npcId'] = assetId;
	}
	yield call(rsf.database.create, `/maps/${mapId}/objects`, payload);
}

function* addImageToMap(action: MapsAddImageAction): any {
	const { mapId, imageRef, initialData } = action;
	let payload = {
		anchor: { x: 0.5, y: 0.5 },
		pivot: { x: 0.5, y: 0.5 },
		name: 'New Map Object',
		position: { x: 0, y: 0 },
		rotation: 0,
		scale: { x: 1, y: 1 },
		imageRef,
		layer: 'background',
		...(initialData || {}) // Override with initial data
	};
	yield call(rsf.database.create, `/maps/${mapId}/objects`, payload);
}

function* updateObject(action: MapsUpdateObjectAction): any {
	const { mapId, mapObjectId, newData } = action;
	yield call(rsf.database.patch, `/maps/${mapId}/objects/${mapObjectId}`, newData);
}

function* removeObject(action: MapsRemoveObjectAction): any {
	const { mapId, mapObjectId } = action;
	yield call(rsf.database.delete, `/maps/${mapId}/objects/${mapObjectId}`);
}

function* updateFogPolygon(action: UpdateFogPolygonAction): any {
	const { mapId, fogPolygonId, position, points } = action;
	if (!points || points.length === 0) {
		yield call(rsf.database.delete, `/maps/${mapId}/fog/maskPolygons/${fogPolygonId}`);
	} else {
		yield call(rsf.database.update, `/maps/${mapId}/fog/maskPolygons/${fogPolygonId}`, {
			position: { x: position.x, y: position.y },
			points: points
		});
	}
}

function* updateFogColour(action: UpdateFogColourAction): any {
	const { mapId, colour } = action;
	yield call(rsf.database.update, `/maps/${mapId}/fog/colour`, colour);
}

function* updateLockedLayers(action: SetLayerLockedAction): any {
	yield call(
		rsf.database.update,
		`/maps/${action.mapId}/layers/${action.layerId}/locked`,
		action.locked
	);
}

export default function* rootSaga() {
	yield all([
		fork(syncMapsSaga),
		takeEvery(types.MAPS.UPDATE.BACKGROUND_COLOUR, updateMapBackgroundColourSaga),
		takeEvery(types.MAPS.ASSET.ADD, addAssetToMap),
		takeEvery(types.MAPS.IMAGE.ADD, addImageToMap),
		takeEvery(types.MAPS.REMOVE.OBJECT, removeObject),
		takeEvery(types.MAPS.UPDATE.OBJECT, updateObject),
		takeEvery(types.MAPS.FOG.UPDATE.POLYGON, updateFogPolygon),
		takeEvery(types.MAPS.FOG.UPDATE.COLOUR, updateFogColour),
		takeEvery(types.MAPS.UPDATE.LAYER_LOCKED, updateLockedLayers)
	]);
}
