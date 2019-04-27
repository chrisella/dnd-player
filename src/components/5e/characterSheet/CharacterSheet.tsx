import React, { ReactNode, ReactElement } from 'react';

// import firebase from 'firebase/app';
// import 'firebase/firestore';

import { RollData, ChatMessageData } from '../../../models/ChatMessage';
import AbilityScore from './AbilityScore';
import AbilitySave from './AbilitySave';

import './CharacterSheet.css';
import { Character } from '../Character';
import Skill from './Skill';
import ProficiencyBonus from './ProficiencyBonus';
import Speed from './Speed';
import Initiative from './Initiative';
import ArmorClass from './ArmorClass';
import HitPoints from './HitPoints';
import Attacks from './Attacks';

interface Props {
	sendMessage: (message: string, data?: ChatMessageData) => void;
	closeCharacterSheet: (characterId: string) => void;
	updatePlayerCharacter: (characterId: string, character: Character) => void;
	character: Character;
}
interface State {
	editing: boolean;
	newCharacter: string;
}

export default class CharacterSheet extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);

		this.state = {
			editing: false,
			newCharacter: JSON.stringify(this.props.character, undefined, ' ')
		};
	}

	// private chatRoom: firebase.firestore.CollectionReference;

	// private cleanup: () => void;

	render(): ReactNode {
		const { character } = this.props;

		if (this.state.editing) {
			return (
				<div className="column character-sheet">
					<div className="character-close" onClick={e => this.abortEditSheet()}>
						CANCEL
					</div>
					<div className="character-edit" onClick={e => this.saveSheet()}>
						SAVE
					</div>
					<textarea
						rows={40}
						value={this.state.newCharacter}
						onChange={e =>
							this.setState({ ...this.state, newCharacter: e.target.value })
						}
					/>
				</div>
			);
		}

		return (
			<div className="column character-sheet">
				<div className="character-close" onClick={e => this.closeSheet()}>
					X
				</div>
				<div className="character-edit" onClick={e => this.editSheet()}>
					EDIT
				</div>
				<div className="row character-details">
					<div className="character-name">{character.name}</div>
					<div className="character-classes">
						{character.levels.map(x => `${x.className} ${x.level}`).join(', ')}
					</div>
				</div>
				<div className="row">
					<div className="ability-container">
						<AbilityScore ability="strength" character={character} {...this.props} />
						<AbilityScore ability="dexterity" character={character} {...this.props} />
						<AbilityScore
							ability="constitution"
							character={character}
							{...this.props}
						/>
						<AbilityScore
							ability="intelligence"
							character={character}
							{...this.props}
						/>
						<AbilityScore ability="wisdom" character={character} {...this.props} />
						<AbilityScore ability="charisma" character={character} {...this.props} />
					</div>
					<ProficiencyBonus character={character} {...this.props} />
					<Speed character={character} {...this.props} />
					<HitPoints character={character} {...this.props} />
				</div>
				<div className="row">
					<div className="column">
						<div className="save-container">
							<AbilitySave ability="strength" character={character} {...this.props} />
							<AbilitySave
								ability="dexterity"
								character={character}
								{...this.props}
							/>
							<AbilitySave
								ability="constitution"
								character={character}
								{...this.props}
							/>
							<AbilitySave
								ability="intelligence"
								character={character}
								{...this.props}
							/>
							<AbilitySave ability="wisdom" character={character} {...this.props} />
							<AbilitySave ability="charisma" character={character} {...this.props} />
							<div className="section-title">Saving Throws</div>
						</div>
					</div>
					<div className="skill-container">
						<Skill
							skill="acrobatics"
							ability="dexterity"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="animalHandling"
							ability="wisdom"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="arcana"
							ability="intelligence"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="athletics"
							ability="strength"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="deception"
							ability="charisma"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="history"
							ability="intelligence"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="insight"
							ability="wisdom"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="intimidation"
							ability="charisma"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="investigation"
							ability="intelligence"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="medicine"
							ability="wisdom"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="nature"
							ability="intelligence"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="perception"
							ability="wisdom"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="performance"
							ability="charisma"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="persuasion"
							ability="charisma"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="religion"
							ability="intelligence"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="sleightOfHand"
							ability="dexterity"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="stealth"
							ability="dexterity"
							character={character}
							{...this.props}
						/>
						<Skill
							skill="survival"
							ability="wisdom"
							character={character}
							{...this.props}
						/>
						<div className="section-title">Skills</div>
					</div>
					<div className="column" style={{ flex: 1 }}>
						<div className="row">
							<Initiative character={character} {...this.props} />
							<ArmorClass character={character} {...this.props} />
						</div>
						<div className="row">
							<Attacks character={character} {...this.props} />
						</div>
					</div>
				</div>
			</div>
		);
	}

	componentDidMount(): void {}
	componentWillUnmount(): void {}

	closeSheet(): void {
		this.props.closeCharacterSheet(this.props.character.id);
	}

	editSheet(): void {
		this.setState({
			...this.state,
			editing: true
		});
	}

	abortEditSheet(): void {
		this.setState({
			...this.state,
			editing: false
		});
	}

	saveSheet(): void {
		const newCharacter = JSON.parse(this.state.newCharacter);
		this.props.updatePlayerCharacter(newCharacter.id, newCharacter);
		this.setState({
			...this.state,
			editing: false
		});
	}
}