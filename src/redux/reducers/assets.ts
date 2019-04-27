import { types } from '../actions/assets';
import { PlayerCharacterData, NonPlayerCharacterData } from '../../models/Asset';

interface AssetState {
	// TODO: Perhaps these pc and npc collections should be object with
	//       key id mapping to value data, for faster lookup times. We don't
	//       really need these to be an array as we don't often iterate it and
	//       Object.keys() is good enough to handle when we do want to iterate.

	playerCharacters: PlayerCharacterData[];
	nonPlayerCharacters: NonPlayerCharacterData[];

	pcSyncError?: string;
	npcSyncError?: string;
}

const initialState: AssetState = {
	playerCharacters: [],
	nonPlayerCharacters: [],

	pcSyncError: null,
	npcSyncError: null
};

export default function assetsReducer(state = initialState, action: any = {}): AssetState {
	switch (action.type) {
		case types.ASSETS.PLAYERCHARACTER.SYNC:
			return {
				...state,
				playerCharacters: action.playerCharacters
			};
		case types.ASSETS.PLAYERCHARACTER.UPDATE:
			return {
				...state,
				playerCharacters: state.playerCharacters.map(item => {
					if (item.id !== action.characterId) {
						// This isn't the item we care about - keep it as-is
						return item;
					}

					// Otherwise, this is the one we want - return an updated value
					return action.character;
				})
			};
		case types.ASSETS.NONPLAYERCHARACTER.SYNC:
			return {
				...state,
				nonPlayerCharacters: action.nonPlayerCharacters
			};
		case types.ASSETS.PLAYERCHARACTER.SYNC_FAILED:
			return {
				...state,
				pcSyncError: action.error
			};
		case types.ASSETS.NONPLAYERCHARACTER.SYNC_FAILED:
			return {
				...state,
				npcSyncError: action.error
			};
		default:
			return state;
	}
}
