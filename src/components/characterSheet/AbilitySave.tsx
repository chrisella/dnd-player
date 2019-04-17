import React, { ReactNode, ReactElement } from 'react';

import { DiceRoll } from 'rpg-dice-roller';
import { RollData, ChatMessageData } from '../../models/ChatMessage';

import './CharacterSheet.css';
import { Character } from '../../models/Character';

interface Props {
	sendMessage: (message: string, data?: ChatMessageData) => void;
	ability: string;
	character: Character;
}
interface State {}

export default class AbilitySave extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);

		this.state = {};

		this.handleClick = this.handleClick.bind(this);
	}

	// private chatRoom: firebase.firestore.CollectionReference;

	// private cleanup: () => void;

	render(): ReactNode {
		const { ability, character } = this.props;
		const modifier = this.getSaveModifier(character, ability);
		const proficiencyClass =
			character.proficiencies.saves[ability] === 2
				? 'expertise'
				: character.proficiencies.saves[ability] === 1
				? 'proficient'
				: character.proficiencies.saves[ability] === 0.5
				? 'half-proficient'
				: 'none';

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
					<div className="save-title">{ability}</div>
					<div className="save-modifier">
						<span className="save-symbol">{modifier < 0 ? '-' : '+'}</span>
						<span className="save-number">{Math.abs(modifier)}</span>
					</div>
				</div>
			</div>
		);
	}

	componentDidMount(): void {}
	componentWillUnmount(): void {}

	getSaveModifier(character: Character, ability: string): number {
		const baseModifier = Math.floor((character[ability] - 10) / 2);
		const proficiencyMultiplier = character.proficiencies.saves[ability] || 0;
		return baseModifier + Math.floor(proficiencyMultiplier * character.proficiencyBonus);
	}

	getLongName(ability: string): string {
		switch (ability) {
			case 'str':
				return 'Strength Save';
			case 'dex':
				return 'Dexterity Save';
			case 'con':
				return 'Constitution Save';
			case 'int':
				return 'Intelligence Save';
			case 'wis':
				return 'Wisdom Save';
			case 'cha':
				return 'Charisma Save';
			default:
				return '';
		}
	}

	handleClick(e, advantage: number): void {
		const modifier = this.getSaveModifier(this.props.character, this.props.ability);
		const modifierStr = (modifier < 0 ? '' : '+') + modifier;
		const roll = new DiceRoll('d20' + modifierStr);
		const stat = this.getLongName(this.props.ability);

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
