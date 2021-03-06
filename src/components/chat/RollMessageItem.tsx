import React, { ReactNode } from 'react';
import { ChatMessage, RollData } from '../../models/ChatMessage';

interface Props {
	message: ChatMessage;
}
export default class RollMessageItem extends React.Component<Props> {
	render(): ReactNode {
		const { message } = this.props;
		const data = message.data as RollData;
		let className;
		switch (data.rollType) {
			case 'Skill Check':
				className = 'roll-skill';
				break;
			case 'Ability Check':
				className = 'roll-ability';
				break;
			case 'Saving Throw':
				className = 'roll-save';
				break;
			case 'Initiative':
				className = 'roll-initiative';
				break;
			case 'Attack':
				className = 'roll-attack';
				break;
			case 'Spell':
				className = 'roll-spell';
				break;
			case 'Ad-hoc':
			default:
				className = 'roll-adhoc';
				break;
		}

		var ignoreRoll1 =
			(data.rollAdvantageType > 0 && data.roll1Total < data.roll2Total) ||
			(data.rollAdvantageType < 0 && data.roll1Total > data.roll2Total);
		var ignoreRoll2 = data.rollAdvantageType && !ignoreRoll1;

		const sender = (message.data && (message.data as any).characterName) || message.sender;

		return (
			<div className={`roll-container ${className}`}>
				<div className="roll-header">
					<span className="roll-type">{data.rollType}</span>
					<span className="roll-user">{sender}</span>
				</div>
				<hr />
				<div className="roll-title">
					<span className="roll-name">{data.rollName}</span>
					{data.modifier !== null && data.modifier !== undefined && (
						<span className="roll-modifier">({data.modifier})</span>
					)}
				</div>
				<div className="roll-rolls">
					<div className={`roll-1 ${ignoreRoll1 ? 'ignore' : ''}`}>
						<span
							className={
								'summary ' +
								(data.roll1CritSuccess
									? 'crit'
									: data.roll1CritFail
									? 'critFail'
									: '')
							}
						>
							<span className="roll-total">{data.roll1Total}</span>
							<span className="roll-suffix">{data.rollSuffix}</span>
						</span>
						<span className="details">{data.roll1Details}</span>
					</div>
					{data.roll2Details && data.rollAdvantageType && (
						<div
							className={
								data.rollAdvantageType > 0 ? 'roll-advantage' : 'roll-disadvantage'
							}
						>
							{data.rollAdvantageType > 0 ? 'A' : 'D'}
						</div>
					)}
					{data.roll2Details && (
						<div className={`roll-2 ${ignoreRoll2 ? 'ignore' : ''}`}>
							<span
								className={
									'summary ' +
									(data.roll2CritSuccess
										? 'crit'
										: data.roll2CritFail
										? 'critFail'
										: '')
								}
							>
								<span className="roll-total">{data.roll2Total}</span>
								<span className="roll-suffix">{data.rollSuffix}</span>
							</span>
							<span className="details">{data.roll2Details}</span>
						</div>
					)}
				</div>
			</div>
		);
	}
}
