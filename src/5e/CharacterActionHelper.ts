import { CharacterAttack, Character } from './models/Character';

import {
	CharacterActionData,
	CharacterActionResult,
	CharacterActionDiceRollResult,
	CharacterActionResultType,
	AdvantageType,
	CharacterActionConditionResult,
	CharacterActionTextResult
} from '../models/ChatMessage';

import Rules, {
	AttackEffect,
	AttackEffectType,
	ToHitAttackEffect,
	DamageAttackEffect,
	SavingThrowAttackEffect,
	TextAttackEffect
} from './5eRules';

import { DiceRoll } from 'rpg-dice-roller';

export default class CharacterActionHelper {
	public static doAction(
		character: Character,
		action: CharacterAttack,
		advantage: number,
		sendMessage: (string, any) => void
	): void {
		let crit = false;

		const data: CharacterActionData = {
			type: 'action',
			title: action.title,
			characterName: character.name,
			results: []
		};

		for (const effect of action.effects) {
			const result = CharacterActionHelper.applyEffect(effect, advantage, crit);
			crit = result.crit;
			data.results.push(result.result);
		}

		sendMessage('', data);
	}

	static applyEffect(
		effect: AttackEffect,
		advantage: number,
		crit: boolean
	): { result: CharacterActionResult; crit: boolean } {
		switch (effect.type) {
			case AttackEffectType.ToHit:
				const toHitEffect = effect as ToHitAttackEffect;
				const modifierStr = (toHitEffect.modifier < 0 ? '' : '+') + toHitEffect.modifier;
				const result: CharacterActionDiceRollResult = {
					advantage: advantage,
					modifier: toHitEffect.modifier,
					type: CharacterActionResultType.DiceRoll,
					rolls: []
				};

				const roll1 = new DiceRoll('d20' + modifierStr);
				const roll1Details = roll1.toString().match(/.*?: (.*?) =/)[1];
				const roll1CritSuccess = roll1.rolls[0][0] === (toHitEffect.critRange || 20);
				const roll1CritFail = roll1.rolls[0][0] === 1;

				let roll2: DiceRoll;
				let roll2Details: string;
				let roll2CritSuccess: boolean;
				let roll2CritFail: boolean;
				if (advantage) {
					roll2 = new DiceRoll('d20' + modifierStr);
					roll2Details = roll2.toString().match(/.*?: (.*?) =/)[1];
					roll2CritSuccess = roll2.rolls[0][0] === (toHitEffect.critRange || 20);
					roll2CritFail = roll2.rolls[0][0] === 1;
				}

				crit =
					advantage >= 0
						? roll1CritSuccess || roll2CritSuccess
						: roll1CritSuccess && roll2CritSuccess;

				result.rolls.push({
					total: roll1.total,
					critFail: roll1CritFail,
					critSuccess: roll1CritSuccess,
					details: roll1Details,
					ignore:
						(roll2 || false) &&
						((advantage > 0 && roll1.total < roll2.total) || roll1.total > roll2.total)
				});
				if (roll2) {
					result.rolls.push({
						total: roll2.total,
						critFail: roll2CritFail,
						critSuccess: roll2CritSuccess,
						details: roll2Details,
						ignore:
							(advantage > 0 && roll1.total >= roll2.total) ||
							roll1.total <= roll2.total
					});
				}
				return { result, crit };
			case AttackEffectType.Damage:
				const damageEffect = effect as DamageAttackEffect;
				const damageRoll = new DiceRoll(
					`${damageEffect.diceCount * (crit ? 2 : 1)}d${
						damageEffect.diceSize
					}+${damageEffect.bonus || 0}`
				);
				const result2: CharacterActionDiceRollResult = {
					advantage: AdvantageType.None,
					modifier: damageEffect.bonus,
					type: CharacterActionResultType.DiceRoll,
					rolls: []
				};

				const damageRollDetails = damageRoll.toString().match(/.*?: (.*?) =/)[1];
				result2.rolls.push({
					critFail: false,
					critSuccess: false,
					details: damageRollDetails,
					ignore: false,
					total: damageRoll.total
				});
				return { result: result2, crit };
			case AttackEffectType.SavingThrow:
				const saveEffect = effect as SavingThrowAttackEffect;
				const result3: CharacterActionConditionResult = {
					type: CharacterActionResultType.Condition,
					condition: `DC ${saveEffect.saveDC} ${Rules.getLongAbilityName(
						saveEffect.saveType
					)} save`,
					onSuccess: this.applyEffect(saveEffect.onSave, 0, crit).result,
					onFailure: this.applyEffect(saveEffect.onFail, 0, crit).result
				};
				return { result: result3, crit };
			case AttackEffectType.Text:
				const textEffect = effect as TextAttackEffect;
				const result4: CharacterActionTextResult = {
					type: CharacterActionResultType.Text,
					text: textEffect.text
				};
				return { result: result4, crit };
			default:
				const result5: CharacterActionTextResult = {
					type: CharacterActionResultType.Text,
					text: `Unexpected attack effect ${effect.type}!`
				};
				return { result: result5, crit };
		}
	}
}