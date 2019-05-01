import React, { ReactNode } from 'react';

import { DiceRoll } from 'rpg-dice-roller';
import { RollData, ChatMessageData } from '../../../../models/ChatMessage';

import './PlayerCharacterSheet.css';
import { PlayerCharacter } from '../../../models/Character';
import Rules from '../../../5eRules';
import { ProficiencyClassMap } from './PlayerCharacterSheet';

interface Props {
	sendMessage: (message: string, data?: ChatMessageData) => void;
	ability: string;
	character: PlayerCharacter;
}

export default class AbilitySave extends React.Component<Props, {}> {
	constructor(props: Props) {
		super(props);

		this.handleClick = this.handleClick.bind(this);
	}

	render(): ReactNode {
		const { ability, character } = this.props;
		const saves = (character.proficiencies || { saves: {} }).saves || {};
		const modifier = Rules.getSaveModifier(character, ability);
		const proficiencyClass = ProficiencyClassMap[saves[ability] || 0];

		return (
			<div className="save" onClick={e => this.handleClick(e, 0)}>
				<div className="popup-advantage" onClick={e => this.handleClick(e, 1)}>
					A
				</div>
				<div className="popup-disadvantage" onClick={e => this.handleClick(e, -1)}>
					D
				</div>
				<div className="save-wrapper">
					<div className={`save-proficiency ${proficiencyClass}`} />
					<div className="save-title">{Rules.getShortAbilityName(ability)}</div>
					<div className="save-modifier">
						<span className="save-symbol">{modifier < 0 ? '-' : '+'}</span>
						<span className="save-number">{Math.abs(modifier)}</span>
					</div>
				</div>
			</div>
		);
	}

	handleClick(e, advantage: number): void {
		const modifier = Rules.getSaveModifier(this.props.character, this.props.ability);
		const modifierStr = (modifier < 0 ? '' : '+') + modifier;
		const roll = new DiceRoll('d20' + modifierStr);
		const stat = Rules.getSaveName(this.props.ability);

		const data: RollData = {
			type: 'roll',
			rollType: 'Save',
			rollName: stat,
			modifier: modifierStr,
			roll1Total: roll.total,
			roll1Details: roll.toString().match(/.*?: (.*?) =/)[1],
			roll1CritSuccess: roll.rolls[0][0] === 20,
			roll1CritFail: roll.rolls[0][0] === 1
		};

		if (advantage) {
			const roll2 = new DiceRoll('d20' + modifierStr);
			data.rollAdvantageType = advantage;
			data.roll2Total = roll2.total;
			data.roll2Details = roll2.toString().match(/.*?: (.*?) =/)[1];
			data.roll2CritSuccess = roll2.rolls[0][0] === 20;
			data.roll2CritFail = roll2.rolls[0][0] === 1;
			e.stopPropagation();
		}

		this.props.sendMessage('', data);
	}
}