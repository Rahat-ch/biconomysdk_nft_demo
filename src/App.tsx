import './App.css'
import "@biconomy/web3-auth/dist/src/style.css"
import { useState, useEffect, useRef } from 'react'
import SocialLogin from "@biconomy/web3-auth"
import { ChainId } from "@biconomy/core-types";
import { ethers } from 'ethers'
import SmartAccount from "@biconomy/smart-account";
import Minter from './components/Minter';
import Spinner from './components/Spinner';


export default function App() {
  const [smartAccount, setSmartAccount] = useState<SmartAccount | null>(null)
  const [interval, enableInterval] = useState(false)
  const sdkRef = useRef<SocialLogin | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    let configureLogin:any
    if (interval) {
      configureLogin = setInterval(() => {
        if (!!sdkRef.current?.provider) {
          setupSmartAccount()
          clearInterval(configureLogin)
        }
      }, 1000)
    }
  }, [interval])

  async function login() {
    if (!sdkRef.current) {
      const socialLoginSDK = new SocialLogin()
      const signature1 = await socialLoginSDK.whitelistUrl('http://localhost:5173/')
      await socialLoginSDK.init({
        chainId: ethers.utils.hexValue(ChainId.POLYGON_MUMBAI).toString(),
        network: "testnet",
        whitelistUrls: {
          'http://localhost:5173/': signature1,
        }
      })
      sdkRef.current = socialLoginSDK
    }
    if (!sdkRef.current.provider) {
      sdkRef.current.showWallet()
      enableInterval(true)
    } else {
      setupSmartAccount()
    }
  }

  async function setupSmartAccount() {
    if (!sdkRef?.current?.provider) return
    sdkRef.current.hideWallet()
    setLoading(true)
    const web3Provider = new ethers.providers.Web3Provider(
      sdkRef.current.provider
    )
    setProvider(web3Provider)
    try {
      const smartAccount = new SmartAccount(web3Provider, {
        activeNetworkId: ChainId.POLYGON_MUMBAI,
        supportedNetworksIds: [ChainId.POLYGON_MUMBAI],
        networkConfig: [
          {
            chainId: ChainId.POLYGON_MUMBAI,
            dappAPIKey: import.meta.env.VITE_BICONOMY_API_KEY,
          },
        ],
      })
      const acct = await smartAccount.init()
      console.log({ deployed: await smartAccount.isDeployed(ChainId.POLYGON_MUMBAI)})
      const isDeployed = await smartAccount.isDeployed(ChainId.POLYGON_MUMBAI)
      if (isDeployed == false) {
        console.log("this one needs to be deployed")
        const deployTx = await smartAccount.deployWalletUsingPaymaster()
        console.log(deployTx);
      }
      setSmartAccount(acct)
      setLoading(false)
    } catch (err) {
      console.log('error setting up smart account... ', err)
    }
  }

  const logout = async () => {
    if (!sdkRef.current) {
      console.error('Web3Modal not initialized.')
      return
    }
    await sdkRef.current.logout()
    sdkRef.current.hideWallet()
    setSmartAccount(null)
    enableInterval(false)
  }

  return (
    <div>
      <h1>Onboard to Account Abstraction</h1>
      <p>Connect and mint an NFT, no wallet or gas neccasary to get started.</p>
      <p>Click and deploy a Smart Account - then mint </p>
      {
        !smartAccount && !loading && <button className='demoButton' onClick={login}>Login</button>
      }
      {
        loading && (
          <div>
            <p>Creating your Smart Account...</p>
            <Spinner />
          </div>
        )
      }
      {
        !!smartAccount && (
          <div className="buttonWrapper">
            <h3>Smart account address:</h3>
            <p>{smartAccount.address}</p>
            <Minter smartAccount={smartAccount} provider={provider} loading={loading} />
            <button className='demoButton' onClick={logout}>Logout</button>
          </div>
        )
      }
      <br />
      <div className='linkWrapper'>
      <a href="https://docs.biconomy.io/introduction/overview" target="_blank" className="read-the-docs">
  Click here to learn more about the Biconomy SDK
    </a>
    </div>
    </div>
  )
}


