import { types, SetDmAction } from '../actions/auth';

interface AuthState {
	loading: boolean;
	loggedIn: boolean;
	user?: firebase.User;
	loginError?: any;
	dm: boolean;
}

const initialState: AuthState = {
	loading: false,
	loggedIn: false,
	user: null,
	loginError: null,
	dm: false
};

export default function authReducer(state: AuthState = initialState, action: any = {}) {
	switch (action.type) {
		case types.LOGIN.REQUEST:
		case types.LOGOUT.REQUEST:
			return {
				...state,
				loading: true
			};
		case types.LOGIN.SUCCESS:
			return {
				...state,
				loading: false,
				loggedIn: true,
				user: action.user,
				loginError: null
			};
		case types.LOGIN.FAILURE:
			return {
				...state,
				loading: false,
				loginError: action.error
			};
		case types.LOGOUT.SUCCESS:
			return initialState;
		case types.LOGOUT.FAILURE:
			return {
				...state,
				loading: false
			};
		case types.DM.SET:
			const a = action as SetDmAction;
			return {
				...state,
				dm: a.value
			};
		default:
			return state;
	}
}
