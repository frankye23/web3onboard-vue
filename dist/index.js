import Web3Onboard from '@onboard-dx/core';
// We use vue-demi to automatically use the correct reactivity API for both Vue 2 and Vue 3
import { ref, computed, readonly, shallowRef } from 'vue-demi';
// Vueuse helper to use the localstorage as a reactive variable
import { useStorage } from '@vueuse/core';
// Vueuse helper to streamline the use of rxjs observables as vue refs
import { useSubscription } from '@vueuse/rxjs';
// Onboard will be kept here to be reused every time that we access the composable
let web3Onboard = null;
// Useful data about the previously connected wallets that will synced with the localstorage
const alreadyConnectedWallets = useStorage('alreadyConnectedWallets', []);
const lastConnectionTimestamp = useStorage('lastWalletConnectionTimestamp', 0);
// We store the internal onboard state as a shallowRef to have reactivity but with a smaller computational cost compared to a full ref
// Because it is shallow, we must update it every time replacing the entire object
const onboardState = shallowRef({});
const updateAlreadyConnectedWallets = () => {
    alreadyConnectedWallets.value = onboardState.value.wallets.map((w) => w.label);
};
const init = (options) => {
    web3Onboard = Web3Onboard(options);
    onboardState.value = web3Onboard.state.get();
    // To avoid memory leaks, we use only one rxjs subscription to update the internal onboard state
    // This subscription will be automatically destroyed when the context is destroyed
    useSubscription(web3Onboard.state.select().subscribe(update => {
        onboardState.value = update;
        updateAlreadyConnectedWallets();
    }));
    return web3Onboard;
};
const useOnboard = () => {
    // Raise an error if init() wasn't called
    if (!web3Onboard) {
        throw new Error('web3Onboard is not initialized');
    }
    // Wallet related functions and variables
    const connectingWallet = ref(false);
    const wallets = computed(() => onboardState.value.wallets);
    const connectedWallet = computed(() => wallets.value.length > 0 ? wallets.value[0] : null);
    const connectWallet = async (options) => {
        connectingWallet.value = true;
        await web3Onboard.connectWallet(options);
        lastConnectionTimestamp.value = Date.now();
        connectingWallet.value = false;
    };
    const disconnectWallet = async (wallet) => {
        connectingWallet.value = true;
        await web3Onboard.disconnectWallet(wallet);
        updateAlreadyConnectedWallets();
        connectingWallet.value = false;
    };
    const disconnectConnectedWallet = async () => {
        if (connectedWallet.value) {
            await disconnectWallet({ label: connectedWallet.value.label });
        }
    };
    // Chain related functions and variables
    const settingChain = ref(false);
    const connectedChain = computed(() => (connectedWallet &&
        connectedWallet.value &&
        connectedWallet.value.chains[0]) ||
        null);
    const getChain = (walletLabel) => {
        const wallet = onboardState.value.wallets.find((w) => w.label === walletLabel);
        return (wallet && wallet.chains[0]) || null;
    };
    const setChain = async (options) => {
        settingChain.value = true;
        await web3Onboard.setChain(options);
        settingChain.value = false;
    };
    return {
        alreadyConnectedWallets,
        connectWallet,
        connectedChain,
        connectedWallet,
        connectingWallet: readonly(connectingWallet),
        disconnectConnectedWallet,
        disconnectWallet,
        getChain,
        lastConnectionTimestamp,
        setChain,
        settingChain: readonly(settingChain),
        wallets
    };
};
export { init, useOnboard };
