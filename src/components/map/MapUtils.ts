import { MapData } from '../../models/Map';
import { MapObject } from '../../models/Map';

export interface GroupedMapObject {
	objects: MapObject[];
	zIndex: number;
	name: string;
}

const zIndexes = {
	background: 0,
	tokens: 1
};

export const groupObjectsByLayer = (map: MapData): GroupedMapObject[] => {
	if (!map || !map.objects) {
		return [];
	}
	return Object.keys(map.objects).reduce((prev: GroupedMapObject[], curr: string): any => {
		const l = map.objects[curr].layer;
		let layer = prev.find(x => x.name === l);
		if (!layer) {
			layer = { objects: [], zIndex: zIndexes[l], name: l };
			prev.push(layer);
		}
		layer.objects.push({
			...map.objects[curr],
			id: curr
		});
		return prev;
	}, []);
};

export const calculateDistance = (
	start: PIXI.PointLike,
	end: PIXI.PointLike,
	scale: number
): string => {
	return (
		Math.pow(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2), 0.5) /
		scale /
		40
	).toFixed(1);
};
