import { useEffect, useState } from 'react';
import './Modal.css';
import { createUser, userLogin } from '../../utils/util';
import type { ModalProps } from '../../utils/Constants';
import { useDispatch } from 'react-redux';
import { setUser } from '../../redux/slices/userSlice';
import PageLoading from '../PageLoading/PageLoading';

const LoginModal = (props: ModalProps) => {

  const [isLogin, setIsLogin] = useState(props.initialIsLogin ?? true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showMismatchFlag, setShowMismatchFlag] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loadingFlag, setLoadingFlag] = useState(false);

  const dispatch = useDispatch();
  
  useEffect(() => {
    if (!isLogin) {
      setShowMismatchFlag(password !== confirmPassword && confirmPassword.length > 0);
    }
  }, [password, confirmPassword, isLogin]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoginError('');
      setLoadingFlag(true);
      const loginRes = await userLogin(email, password);
      setLoadingFlag(false);
      if (loginRes) {
        props.setDisplayFlag(false);
        dispatch(setUser({id: loginRes.id, email: loginRes.email, accountType: loginRes.accountType}));
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const handleCreateAccount = async (email: string, password: string) => {
    try {
      setLoginError('');
      setLoadingFlag(true);
      const createRes = await createUser(email, password);
      setLoadingFlag(false);
      if (createRes) {
        props.setDisplayFlag(false);
        dispatch(setUser({id: createRes.id, email: createRes.email, accountType: createRes.accountType}));
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Account creation failed');
    }
  };

  const Login = <div className="relative bg-white p-6 rounded shadow-lg w-96">
        <div className='modal-close' onClick={() => props.setDisplayFlag(false)}>X</div>
        <h2 className="text-2xl font-bold text-black mb-4">Login</h2>
        <div className="relative">
          {loadingFlag && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="loading-circle" />
            </div>
          )}
          {/* Kept mounted (just hidden) instead of swapped out while loading,
              so the form's own layout keeps reserving its normal height —
              otherwise the modal would shrink to fit only the spinner. */}
          <form
            onSubmit={async (e) => {e.preventDefault(); await handleLogin(email, password);}}
            style={loadingFlag ? { visibility: 'hidden' } : undefined}
          >
            <div className="mb-4">
              <label className="mb-2" htmlFor="email">Email</label>
              <input className="w-full text-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="mb-2" htmlFor="password">Password</label>
              <input className="w-full text-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {loginError && <p className="text-red-600 text-xs text-center mb-2">{loginError}</p>}
            <button className="w-full button" type="submit">Login</button>
          </form>
        </div>
        <div className="text-black text-xs flex justify-center gap-1 mt-5" style={loadingFlag ? { visibility: 'hidden' } : undefined}>
          <p>Don't have an account?</p>
          <p className="text-blue-700 underline cursor-pointer" onClick={() => setIsLogin(false)}>Create One</p>
        </div>
      </div>

  const CreateAccount = <div className="relative bg-white p-6 rounded shadow-lg w-96">
      <div className='modal-close' onClick={() => props.setDisplayFlag(false)}>X</div>
       <h2 className="text-2xl font-bold text-black mb-4">Create Account</h2>
        <form onSubmit={(e) => {e.preventDefault(); if (!showMismatchFlag) handleCreateAccount(email, password);}}>
          <div className="mb-4">
            <label className="mb-2">Email</label>
            <input className="w-full text-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="mb-2">Password</label>
            <input className="w-full text-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label className="mb-2 mt-4">Confirm Password</label>
            <input className='w-full text-input' type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)}/>
            {showMismatchFlag && <p className="text-red-600 text-left">Passwords do not match</p>}
          </div>
          <button className="w-full button" type="submit">Create Account</button>
        </form>
        <div className="text-black text-xs flex justify-center gap-1 mt-5">
          <p>Already have an account?</p>
          <p className="text-blue-700 underline cursor-pointer" onClick={() => setIsLogin(true)}>Login</p>
        </div>
      </div>
  return (
    <div className="modal">
      {isLogin ? Login : CreateAccount}
    </div>
  );
};

export default LoginModal;