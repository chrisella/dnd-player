import React, { Component, ReactNode } from 'react';
import { connect } from 'react-redux';
import AssetList from './AssetList';
import { Upload } from '../../models/Upload';
import { PlayerCharacter, NonPlayerCharacter } from '../../5e/models/Character';
import { changeNonPlayerCharacterFilterText, openCharacterSheet } from '../../redux/actions/assets';
import { getFilteredNpcs } from '../../redux/selectors/assets';

interface StateProps {
	playerCharacters: PlayerCharacter[];
	nonPlayerCharacters: NonPlayerCharacter[];
	images: Upload[];
	nonPlayerCharacterFilter: string;
	dm: boolean;
}
interface DispatchProps {
	changeNonPlayerCharacterFilterText: (text: string) => void;
	openCharacterSheet: (characterId: string) => void;
}
interface OwnProps {}

type Props = StateProps & DispatchProps & OwnProps;

class AssetListContainer extends Component<Props> {
	render(): ReactNode {
		const {
			playerCharacters,
			nonPlayerCharacters,
			openCharacterSheet,
			images,
			changeNonPlayerCharacterFilterText,
			nonPlayerCharacterFilter,
			dm
		} = this.props;
		return (
			<div>
				<h1>Asset List</h1>
				<AssetList
					playerCharacters={playerCharacters}
					nonPlayerCharacters={nonPlayerCharacters}
					openCharacterSheet={openCharacterSheet}
					changeNonPlayerCharacterFilterText={changeNonPlayerCharacterFilterText}
					nonPlayerCharacterFilter={nonPlayerCharacterFilter}
					images={images}
					dm={dm}
				/>
			</div>
		);
	}
}

const mapStateToProps = (state): StateProps => ({
	playerCharacters: state.assets.playerCharacters,
	nonPlayerCharacters: getFilteredNpcs(state),
	images: state.images.images,
	nonPlayerCharacterFilter: state.assets.nonPlayerCharacterFilter,
	dm: state.auth.dm
});
const mapDispatchToProps = (dispatch): DispatchProps => ({
	changeNonPlayerCharacterFilterText: (text: string) =>
		dispatch(changeNonPlayerCharacterFilterText(text)),
	openCharacterSheet: (characterId: string) => dispatch(openCharacterSheet(characterId))
});

export default connect<StateProps, DispatchProps, OwnProps>(
	mapStateToProps,
	mapDispatchToProps
)(AssetListContainer);
