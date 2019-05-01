import React, { ReactNode } from 'react';

import { ChatMessageData } from '../../../../models/ChatMessage';

import css from './NonPlayerCharacterSheet.module.css';
import { Character } from '../../../models/Character';
import AbilityScore from './AbilityScore';

interface Props {
	sendMessage: (message: string, data?: ChatMessageData) => void;
	character: Character;
}

export default class AbilityScoreContainer extends React.Component<Props, {}> {
	render(): ReactNode {
		const { character } = this.props;

		return (
			<div className={css.abilityContainer}>
				<AbilityScore ability="strength" {...this.props} />
				<AbilityScore ability="dexterity" {...this.props} />
				<AbilityScore ability="constitution" {...this.props} />
				<AbilityScore ability="intelligence" {...this.props} />
				<AbilityScore ability="wisdom" {...this.props} />
				<AbilityScore ability="charisma" {...this.props} />
			</div>
		);
	}
}
