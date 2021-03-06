import React, { Component, ReactNode, ReactElement } from 'react';
import { Switch, Route } from 'react-router';
import styles from './App.module.scss';
import { HashRouter } from 'react-router-dom';

import CharacterSheetContainer from '../5e/components/characterSheet/CharacterSheetContainer';
import ImageUploaderContainer from './sidebar/panels/imageUploader/ImageUploaderContainer';
import Authentication from './authentication/Authentication';
import MapContainer from './map/MapContainer';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core';

import { Provider } from 'react-redux';
import store from '../redux/store';

import { DragDropContextProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import PropertiesPanelContainer from './propertiesPanel/PropertiesPanelContainer';
import ChatContainer from './chat/ChatContainer';
import OverlayTabsContainer from './sidebar/OverlayTabsContainer';
import { PersistGate } from 'redux-persist/integration/react';
import { configure as HotkeysConfigure, GlobalHotKeys } from 'react-hotkeys';
import { openChat, closeChat } from '../redux/actions/chat';
import { mapsToggleMeasureMode, toggleFogEditMode, toggleFogAddMode } from '../redux/actions/maps';
import { keyUpShiftAction, keyDownShiftAction } from '../redux/actions/keys';
import InitiativeTrackerContainer from './initiative/InitiativeTrackerContainer';
import { toggleInitiativeTracker, toggleSidebar, toggleUserList } from '../redux/actions/ui';
import UserListContainer from './userList/UserListContainer';

const keyMap = {
	OPEN_CHAT: 'enter',
	CLOSE_CHAT: 'esc',
	TOGGLE_MEASURE_MODE: 'm',
	TOGGLE_FOG_EDIT_MODE: 'f',
	TOGGLE_FOG_ADD_MODE: 'a',
	TOGGLE_SIDEBAR: 's',
	TOGGLE_INITIATIVE_TRACKER: 'i',
	TOGGLE_USERLIST: 'u',
	SHIFT_DOWN: { sequence: 'shift', action: 'keydown' },
	SHIFT_UP: { sequence: 'shift', action: 'keyup' }
};

const ignoreKeyRepeats = (cb: (event: KeyboardEvent) => void): ((e: KeyboardEvent) => void) => (
	e: KeyboardEvent
): void => {
	if (e.repeat) {
		return; // Prevent key repeats
	}
	if (cb) {
		cb(e);
	}
};

const handlers = {
	OPEN_CHAT: event => store.store.dispatch(openChat()),
	CLOSE_CHAT: event => store.store.dispatch(closeChat()),
	TOGGLE_MEASURE_MODE: event => store.store.dispatch(mapsToggleMeasureMode()),
	SHIFT_DOWN: event => store.store.dispatch(keyDownShiftAction()),
	SHIFT_UP: event => store.store.dispatch(keyUpShiftAction()),
	TOGGLE_FOG_EDIT_MODE: event => store.store.dispatch(toggleFogEditMode()),
	TOGGLE_FOG_ADD_MODE: event => store.store.dispatch(toggleFogAddMode()),
	TOGGLE_INITIATIVE_TRACKER: event => store.store.dispatch(toggleInitiativeTracker()),
	TOGGLE_SIDEBAR: event => store.store.dispatch(toggleSidebar()),
	TOGGLE_USERLIST: event => store.store.dispatch(toggleUserList())
};
export class App extends Component<{}, {}> {
	constructor(props) {
		super(props);

		HotkeysConfigure({
			// logLevel: 'verbose'
		});
	}

	render(): ReactNode {
		const theme = createMuiTheme({
			palette: {
				type: 'dark'
			},
			typography: {
				useNextVariants: true
			}
		});

		return (
			<Provider store={store.store}>
				<PersistGate persistor={store.persistor}>
					<GlobalHotKeys keyMap={keyMap as any} handlers={handlers} />
					<HashRouter>
						<DragDropContextProvider backend={HTML5Backend}>
							<div className="App">
								<MuiThemeProvider theme={theme}>
									<Switch>
										<Route
											exact
											path="/"
											render={(): ReactElement => (
												<div>
													<OverlayTabsContainer />
													<div className={styles.overlayWrapper}>
														<ChatContainer />
													</div>
													<div className={styles.mapWrapper}>
														<PropertiesPanelContainer />
														<InitiativeTrackerContainer />
														<UserListContainer />
														<MapContainer />
													</div>
													<div>
														<CharacterSheetContainer {...this.props} />
													</div>
												</div>
											)}
										/>
										<Route
											path="/upload"
											render={(): ReactElement => <ImageUploaderContainer />}
										/>
										<Route
											path="/login"
											render={(): ReactElement => <Authentication />}
										/>
									</Switch>
								</MuiThemeProvider>
							</div>
						</DragDropContextProvider>
					</HashRouter>
				</PersistGate>
			</Provider>
		);
	}
}

export default App;
