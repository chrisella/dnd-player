import * as PIXI from 'pixi.js';
import { PixiComponent } from '@inlet/react-pixi';
import Midpoint from './Midpoint';
import Handle from './Handle';
import DeleteImage from './delete.png';
import { getMidpointOfPoints } from '../../MapUtils';

/**
 * TODO: This could all do with refactoring!
 */
export class EditablePolygonContainer extends PIXI.Container {
	constructor(polyPoints: number[], onUpdate: (position: PIXI.Point, points: number[]) => void) {
		super();

		const poly = new PIXI.Polygon(polyPoints);
		// poly.close();

		this._onUpdate = onUpdate;

		this._localPoints = polyPoints;
		this._pPoints = this.convertToPoints(this._localPoints);

		const g = new PIXI.Graphics();
		g.lineStyle(8, 0x00ff00);
		g.beginFill(0x00ff00, 0.4);
		g.drawPolygon(poly);
		g.endFill();
		g.name = 'poly';
		g.hitArea = poly;
		g.interactive = true;
		g.on('mousedown', this.onMouseDown.bind(this));
		g.on('mousemove', this.onMouseMove.bind(this));
		g.on('mouseup', this.onMouseUp.bind(this));

		this.addChild(g);

		// const t = PIXI.Texture.fromImage(DeleteImage, undefined, undefined, 1.0);
		const d = PIXI.Sprite.from(DeleteImage);
		d.name = 'delete';
		d.width = 142 * 4;
		d.height = 256 * 4;
		d.anchor.set(0.5, 0.5);
		d.interactive = true;
		d.buttonMode = true;
		d.on('click', (e: PIXI.interaction.InteractionEvent) => {
			console.log(`Delete clicked`);
			this._delete();
		});
		d.on('mouseover', (e: PIXI.interaction.InteractionEvent) => {
			d.tint = 0xff0000;
			this._deleteHover = true;
			this.updateLocal(); // No data passed, just re-draw the poly
		});
		d.on('mouseout', (e: PIXI.interaction.InteractionEvent) => {
			d.tint = 0xffffff;
			this._deleteHover = false;
			this.updateLocal(); // No data passed, just re-draw the poly
		});

		const mp = getMidpointOfPoints(this._localPoints);
		d.position.set(mp[0], mp[1]);
		// const spriteScale = 0.12 * (1 / this._viewportZoom);
		// d.scale.set(spriteScale, spriteScale);

		this.addChild(d);

		this.redrawHandles();
		this.redrawMidpoints();
		this.redrawDeleteHandle();
	}

	get localPoints(): number[] {
		return this._localPoints;
	}

	public updateLocal = (data?: number[]): void => {
		if (data) {
			this._localPoints = data;
			this._pPoints = this.convertToPoints(this._localPoints);
		}

		const polyGraphic = this.getChildByName('poly') as PIXI.Graphics;
		if (polyGraphic) {
			const poly = new PIXI.Polygon(this._localPoints);
			// poly.close();

			polyGraphic.clear();
			polyGraphic.lineStyle(8, 0x00ff00);
			polyGraphic.beginFill(this._deleteHover ? 0xc12424 : 0x00ff00, 0.4);
			polyGraphic.drawPolygon(poly);
			polyGraphic.endFill();
			polyGraphic.hitArea = poly;
		}

		// Re-draw Delete icon
		this.redrawDeleteHandle();

		// Re-draw MidPoints
		this._midPoints.forEach(x => this.removeChild(x));
		this.redrawMidpoints();
	};

	public addNewPoint = (midPointIndex: number, point: PIXI.Point): void => {
		const d = [...this._localPoints];
		d.splice(midPointIndex * 2 + 2, 0, point.x, point.y);

		this.updateLocal(d);

		this.redrawHandles();
	};

	public closePolygonIfPossible = (): void => {
		// If the start and end handle points are within a threshold then close the polygon
		// somehow and set a fill
	};

	// TODO: Support an EditablePoly that is just a line I.E. 2 points, 1 line and 1 midpoint
	// I think it basically does already, what's really needed is the ability to handle
	// closed polygons and also close them by dragging an end index marker ontop of the other end
	// index marker

	set viewportZoom(val: number) {
		if (val !== this._viewportZoom) {
			this._viewportZoom = val || 1;
			this.redrawHandles();
			this.redrawMidpoints();
			this.redrawDeleteHandle();
		}
	}

	public triggerUpdate(): void {
		if (this._onUpdate) {
			this._onUpdate(this.position, this._localPoints);
		}
	}

	private _delete(): void {
		if (this._onUpdate) {
			this._onUpdate(this.position, null);
		}
	}

	private _onUpdate: (position: PIXI.Point, points: number[]) => void;

	private _viewportZoom: number = 1;

	private _deleteHover: boolean = false;

	private _pPoints: PIXI.Point[] = [];
	private _localPoints: number[] = [];
	private _handles: Handle[] = [];
	private _midPoints: Midpoint[] = [];

	private redrawDeleteHandle(): void {
		const deleteSprite = this.getChildByName('delete') as PIXI.Sprite;
		if (deleteSprite) {
			// This may be unneccessarily process intensive, moving the icon each re-draw
			// while dragging.
			const m = getMidpointOfPoints(this._localPoints);
			const spriteScale = 0.12 * (1 / this._viewportZoom);
			deleteSprite.position.set(m[0], m[1]);
			deleteSprite.scale.set(spriteScale, spriteScale);
		}
	}

	private redrawHandles(handleSize: number = 32): void {
		this._handles.forEach(x => this.removeChild(x));
		this._handles = [];

		handleSize = handleSize * (1 / this._viewportZoom);
		const lineThickness = 4 * (1 / this._viewportZoom);

		let j = 0;
		for (let p of this._pPoints) {
			const rect = new PIXI.Rectangle(
				-(handleSize / 2),
				-(handleSize / 2),
				handleSize,
				handleSize
			);
			const handle = new Handle(rect);
			handle.position.set(p.x, p.y);
			this._handles.push(handle);
			handle.pointIndex = j;
			handle.name = `handles-${j++}`;
			handle.interactive = true;
			handle.hitArea = rect;
			handle.lineStyle(lineThickness, 0xff0000);
			handle.drawShape(rect);
			this.addChild(handle);
		}
	}

	private redrawMidpoints(handleSize: number = 16): void {
		this._midPoints.forEach(x => this.removeChild(x));
		this._midPoints = [];

		handleSize = handleSize * (1 / this._viewportZoom);
		const lineThickness = 3 * (1 / this._viewportZoom);

		let halfwayPoints: PIXI.Point[] = [];
		for (let i = 0; i < this._pPoints.length - 1; i++) {
			const p1 = this._pPoints[i];
			// const p2 = this._pPoints[i === this._pPoints.length - 1 ? 0 : i + 1];
			const p2 = this._pPoints[i + 1];
			const midPoint = new PIXI.Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
			halfwayPoints.push(midPoint);
		}

		if (this._pPoints.length > 2) {
			const midPoint = new PIXI.Point(
				(this._pPoints[0].x + this._pPoints[this._pPoints.length - 1].x) / 2,
				(this._pPoints[0].y + this._pPoints[this._pPoints.length - 1].y) / 2
			);
			halfwayPoints.push(midPoint);
		}

		let k = 0;
		for (let p of halfwayPoints) {
			const midPoint = new Midpoint();
			midPoint.position.set(p.x, p.y);
			this._midPoints.push(midPoint);
			midPoint.midPointIndex = k;
			midPoint.name = `midPoints-${k++}`;
			midPoint.lineStyle(lineThickness, 0x0000ff);
			const rect = new PIXI.Rectangle(
				-(handleSize / 2),
				-(handleSize / 2),
				handleSize,
				handleSize
			);
			midPoint.drawShape(rect);
			midPoint.interactive = true;
			midPoint.hitArea = rect;
			this.addChild(midPoint);
		}
	}

	private convertToPoints(points: number[]): PIXI.Point[] {
		// Convert the number[] to a PIXI.Point[]
		let pPoints: PIXI.Point[] = [];
		for (let i = 0; i < points.length; i += 2) {
			const pp = new PIXI.Point(points[i], points[i + 1]);
			pPoints.push(pp);
		}
		return pPoints;
	}

	private _dragging: boolean = false;
	private _dragData?: PIXI.interaction.InteractionData = null;
	private _dragGrabOffset?: PIXI.Point = null;

	private onMouseDown(e: PIXI.interaction.InteractionEvent): void {
		this._dragging = true;
		this._dragData = e.data;
		const local = e.data.getLocalPosition(this);
		this._dragGrabOffset = new PIXI.Point(local.x * this.scale.x, local.y * this.scale.y);
	}
	private onMouseMove(e: PIXI.interaction.InteractionEvent): void {
		if (this._dragging) {
			const newPos = this._dragData.getLocalPosition(this.parent);
			// this.position.set(newPos.x, newPos.y);
			this.x = newPos.x - (this._dragGrabOffset ? this._dragGrabOffset.x : 0);
			this.y = newPos.y - (this._dragGrabOffset ? this._dragGrabOffset.y : 0);

			console.log(`${this.position.x}, ${this.position.y}`);

			const pPoints = this.convertToPoints(this._localPoints); // TODO: This shouldn't need to be recalculated here
			this.redrawHandles();
			this.redrawMidpoints();
		}
	}
	private onMouseUp(e: PIXI.interaction.InteractionEvent): void {
		this._dragging = false;
		this._dragData = null;
		this._dragGrabOffset = null;

		this.triggerUpdate();
	}
}

interface Props {
	position: PIXI.Point;
	editMode?: boolean;
	polyPoints: number[];
	viewportZoom: number;
	onUpdate: (position: PIXI.Point, points: number[]) => void;
}

export default PixiComponent<Props, EditablePolygonContainer>('EditablePolygon', {
	create: (props: Props): EditablePolygonContainer => {
		const c = new EditablePolygonContainer(props.polyPoints, props.onUpdate);

		c.position = props.position;

		c.viewportZoom = props.viewportZoom;

		return c;
	},
	applyProps: (instance: EditablePolygonContainer, oldProps: Props, newProps: Props): void => {
		const p = instance.getChildByName('poly') as PIXI.Graphics;

		instance.viewportZoom = newProps.viewportZoom;

		// TODO: Calc new poly from newProps
		// Create a new PIXI.Polygon and pass into updateLocal
		// instance.updateLocal(newPoly)
	},
	didMount: (instance: EditablePolygonContainer, parent: PIXI.Container): void => {
		const onClick = (e: PIXI.interaction.InteractionEvent): void => {
			// const inst = instance as PIXI.Sprite;
			// if (inst && (inst as any).onSelect) {
			// 	(inst as any).onSelect(inst);
			// }
		};
		// instance.on('mousedown', instance.onDragStart);
		// instance.on('mouseup', instance.onDragEnd);
		// instance.on('mouseupoutside', instance.onDragEnd);
		// instance.on('mousemove', instance.onDragMove);
		// instance.on('mouseover', instance.onMouseOver);
		// instance.on('mouseout', instance.onMouseOut);
		// instance.on('click', onClick);
	},

	willUnmount: (instance: EditablePolygonContainer, parent: PIXI.Container): void => {
		// instance.off('mousedown');
		// instance.off('mouseup');
		// instance.off('mouseupoutside');
		// instance.off('mousemove');
		// instance.off('mouseover');
		// instance.off('mouseout');
		// instance.off('click');
	}
});
