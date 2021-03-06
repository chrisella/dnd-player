export interface InitiativeData {
	currentTurn?: string;
	rolls?: {
		[key: string]: InitiativeRoller;
	};
}

export interface InitiativeRoller {
	id?: string; // - Populated when converting Object to array
	pcId?: string;
	npcTokenId?: string; // Replaces npcId;
	initiativeRoll: number;
}
