import React, { useState } from 'react';
import { ethers } from 'ethers';
import { WalletIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { authApi, apiClient } from '../../utils/api';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 连接钱包并进行签名认证
  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('Please install MetaMask wallet');
      }

      // 连接钱包
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // 获取挑战信息
      const challengeResponse = await apiClient.post(authApi.challenge(), {
        wallet_address: address
      });

      const { challenge, expires_at } = challengeResponse.data;

      // 签名消息
      const signature = await signer.signMessage(challenge);

      // 验证签名并登录
      const verifyResponse = await apiClient.post(authApi.verify(), {
        wallet_address: address,
        signature: signature,
        challenge: challenge
      });

      const { access_token, user } = verifyResponse.data;

      // 保存token到localStorage
      localStorage.setItem('access_token', access_token);

      // 调用成功回调
      onLoginSuccess(user);

    } catch (err: any) {
      console.error('Login failed:', err);

      let errorMessage = 'Login failed, please try again';

      if (err.response?.data?.detail) {
        // If detail is a string, use it directly
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        }
        // If detail is an array (Pydantic validation error), extract error messages
        else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail
            .map((error: any) => error.msg || error.message || 'Validation error')
            .join(', ');
        }
        // If detail is an object, try to extract error message
        else if (typeof err.response.data.detail === 'object') {
          errorMessage = err.response.data.detail.msg ||
                        err.response.data.detail.message ||
                        'Request parameter error';
        }
      } else if (err.code === 4001) {
        errorMessage = 'User rejected the signature request';
      } else if (err.code === 'ACTION_REJECTED') {
        errorMessage = 'User rejected the signature request';
      } else if (err.message?.includes('MetaMask')) {
        errorMessage = err.message;
      } else if (err.message) {
        // Clean up technical error messages
        if (err.message.includes('user rejected action')) {
          errorMessage = 'User rejected the signature request';
        } else if (err.message.includes('rejected')) {
          errorMessage = 'User rejected the signature request';
        } else {
          errorMessage = 'Login failed, please try again';
        }
      }

      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <WalletIcon className="mx-auto h-12 w-12 text-indigo-600" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Chain Data Parser System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in with your wallet
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Login Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isConnecting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <WalletIcon className="w-5 h-5 mr-2" />
                    Connect MetaMask Wallet
                  </>
                )}
              </button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Supported Wallets</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <div className="text-center text-sm text-gray-600">
                  <p>• MetaMask</p>
                  <p>• Other compatible wallets</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-center text-xs text-gray-500">
              <p>By logging in, you agree to our Terms of Service and Privacy Policy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 扩展window对象类型
declare global {
  interface Window {
    ethereum?: any;
  }
}