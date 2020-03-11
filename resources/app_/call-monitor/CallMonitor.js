var CallMonitor;
(function (CallMonitor) {
    class FrameSinkProxy extends EventEmitter {
        constructor(bufferName) {
            super();
            this.bufferName = bufferName;
        }
        dispose() {
        }
        getStats() {
            throw new Error('not implemented');
        }
        getMetadata() {
            throw new Error('not implemented');
        }
        setVideoPreference(width, height) {
            sendMessage('setVideoPreference', { width, height });
        }
        getFrameType() {
            return 1;
        }
        setIgnoreMirroring(ignore) {
        }
        getBufferName() {
            return this.bufferName;
        }
        log(level, message) {
            sendMessage('log', { level, message });
        }
    }
    const bodyElement = document.body;
    const avatarImage = document.getElementById('avatarImage');
    const avatarIcon = document.getElementById('avatarIcon');
    const microphoneButton = document.getElementById('microphone');
    const endCallButton = document.getElementById('callEnd');
    const videoButton = document.getElementById('video');
    const closeButton = document.getElementById('close');
    const sharingButton = document.getElementById('sharing');
    const focusStart = document.getElementById('focusStart');
    const focusEnd = document.getElementById('focusEnd');
    let firstFocus = true;
    focusStart.addEventListener('focus', (event) => {
        event.preventDefault();
        if (firstFocus) {
            microphoneButton.focus();
            firstFocus = false;
        }
        else {
            closeButton.focus();
        }
    });
    focusEnd.addEventListener('focus', (event) => {
        event.preventDefault();
        microphoneButton.focus();
    });
    const state = {
        microphoneOn: true,
        videoOn: false,
        sharingOn: false
    };
    let renderer;
    const init = () => {
        callMonitorApi.initFocusOutline();
        if (!callMonitorApi.supportsTransparency()) {
            setBodyClass('noTransparency');
        }
        if (callMonitorApi.isMac()) {
            setBodyClass('mac');
        }
        addClickEvent(microphoneButton, handleMicrophone);
        addClickEvent(endCallButton, handleEndCall);
        addClickEvent(videoButton, handleCamera);
        addClickEvent(closeButton, handleClose);
        addClickEvent(sharingButton, handleSharing);
        bodyElement.addEventListener('dblclick', () => sendMessage('navigateToCall'));
        callMonitorApi.onMessage(onNewMessage);
        sendMessage('ready');
    };
    const onNewMessage = (name, ...args) => {
        console.debug(`[CallMonitorPopup] Received message - name: ${name} args: ${JSON.stringify(args)}`);
        const handler = {
            conversationUpdated: onConversationUpdated,
            AVCapabilitiesUpdated: onAVCapabilitiesUpdated,
            translationsUpdated: onTranslationsUpdated,
            isMuted: onMuteChange,
            isVideoOn: onVideoChange,
            isSharingOn: onSharingChange,
            showVideo: (info) => {
                if (info) {
                    renderer = createRenderer(info.bufferName);
                }
            },
            stopVideo: destroyRenderer,
            ecsScreenShareIcon: showScreenShareIcon
        };
        if (handler.hasOwnProperty(name)) {
            handler[name](...args);
        }
        else {
            console.error(`[CallMonitorPopup] Unhandled message: ${name}`);
        }
    };
    const handleEndCall = () => {
        sendMessage('endCall');
    };
    const handleMicrophone = () => {
        if (state.microphoneOn) {
            sendMessage('mute');
        }
        else {
            sendMessage('unmute');
        }
    };
    const handleCamera = () => {
        if (state.videoOn) {
            sendMessage('videoStop');
        }
        else {
            sendMessage('videoStart');
        }
    };
    const handleClose = () => {
        sendMessage('close');
    };
    const handleSharing = () => {
        if (state.sharingOn) {
            sendMessage('sharingStop');
        }
        else {
            sendMessage('sharingStart');
        }
    };
    const videoSizeChanged = (size) => {
        sendMessage('videoSizeChanged', size);
    };
    const onConversationUpdated = (conversationData) => {
        setState('avatarUrl', conversationData.avatarUrl);
        if (state.avatarUrl) {
            updateAvatar();
        }
        if (conversationData.isPstnCall && !conversationData.isGroupCall) {
            updateAvatarToPSTN();
        }
        else if (conversationData.isGroupCall) {
            updateAvatarToGroup();
        }
        if (conversationData.isGroupCall) {
            setBodyClass('groupCall');
        }
        else {
            removeBodyClass('groupCall');
        }
    };
    const onAVCapabilitiesUpdated = (AVCapabilities) => {
        if (AVCapabilities.canStartAudio) {
            enableMicrophoneButton();
        }
        else {
            disableMicrophoneButton();
        }
        if (AVCapabilities.canStartVideo) {
            enableVideoButton();
        }
        else {
            disableVideoButton();
        }
        if (AVCapabilities.canShareScreen) {
            enableSharingButton();
        }
        else {
            disableSharingButton();
        }
    };
    const onMuteChange = (isMuted) => {
        if (isMuted) {
            setMicrophoneButtonOff();
            setBodyClass('microphoneOff');
        }
        else {
            setMicrophoneButtonOn();
            setBodyClass('microphoneOn');
        }
        setState('microphoneOn', !isMuted);
    };
    const onVideoChange = (isVideoOn) => {
        if (isVideoOn) {
            setVideoButtonOn();
        }
        else {
            setVideoButtonOff();
        }
        setState('videoOn', isVideoOn);
    };
    const onSharingChange = (isSharingOn) => {
        if (isSharingOn) {
            setSharingButtonOn();
        }
        else {
            setSharingButtonOff();
        }
        setState('sharingOn', isSharingOn);
    };
    const onTranslationsUpdated = (translations) => {
        setState('translations', translations);
        setButtonTitle(endCallButton, translations.endCall);
        setButtonTitle(closeButton, translations.close);
        if (state.sharingOn) {
            setButtonTitle(sharingButton, translations.sharingStop);
        }
        else {
            setButtonTitle(sharingButton, translations.sharingStart);
        }
        if (state.microphoneOn) {
            setButtonTitle(microphoneButton, translations.mute);
        }
        else {
            setButtonTitle(microphoneButton, translations.unmute);
        }
        if (state.videoOn) {
            setButtonTitle(videoButton, translations.videoEnd);
        }
        else {
            setButtonTitle(videoButton, translations.videoStart);
        }
    };
    const createRenderer = (bufferName) => {
        try {
            destroyRenderer();
            const vr = callMonitorApi.videoRenderer;
            const videoContainer = document.getElementById('videoContainer');
            setBodyClass('remoteVideoOn');
            if (vr && bufferName && videoContainer) {
                const sink = new FrameSinkProxy(bufferName);
                const args = {
                    container: videoContainer,
                    transparent: true,
                    scalingMode: 1
                };
                let newRenderer = vr.createChromiumVideoRenderer(sink, args);
                newRenderer.on('video-size-changed', videoSizeChanged);
                videoSizeChanged(newRenderer.getVideoSize());
                return newRenderer;
            }
        }
        catch (e) {
            console.error(`[CallMonitorPopup] Failed to create ChromiumVideoRenderer: ${e}`);
        }
        return undefined;
    };
    const destroyRenderer = () => {
        if (renderer) {
            renderer.removeAllListeners();
            renderer.dispose();
            renderer = undefined;
            removeBodyClass('remoteVideoOn');
        }
    };
    const showScreenShareIcon = (setting) => {
        switch (setting) {
            case 'UseAltScreenShareIconOne': {
                setButtonClass(sharingButton, 'sharingIconDefault', 'sharingIcon1');
                break;
            }
            case 'UseAltScreenShareIconTwo': {
                setButtonClass(sharingButton, 'sharingIconDefault', 'sharingIcon2');
                break;
            }
        }
    };
    const setState = (key, value) => {
        state[key] = value;
    };
    const sendMessage = (name, ...args) => {
        console.debug(`[CallMonitorPopup] Sending message - name: ${name} args: ${JSON.stringify(args)}`);
        callMonitorApi.sendMessage(name, ...args);
    };
    const addClickEvent = (element, handler) => {
        element.addEventListener('click', handler);
    };
    const updateAvatar = () => {
        avatarImage.style.backgroundImage = 'url(' + state.avatarUrl + ')';
    };
    const updateAvatarToPSTN = () => {
        setButtonClass(avatarIcon, 'oneToOne', 'pstn');
    };
    const updateAvatarToGroup = () => {
        setButtonClass(avatarIcon, 'oneToOne', 'group');
    };
    const enableMicrophoneButton = () => {
        microphoneButton.removeAttribute('disabled');
    };
    const disableMicrophoneButton = () => {
        microphoneButton.setAttribute('disabled', 'disabled');
    };
    const enableVideoButton = () => {
        videoButton.removeAttribute('disabled');
    };
    const disableVideoButton = () => {
        videoButton.setAttribute('disabled', 'disabled');
    };
    const enableSharingButton = () => {
        sharingButton.removeAttribute('disabled');
    };
    const disableSharingButton = () => {
        sharingButton.setAttribute('disabled', 'disabled');
    };
    const setBodyClass = (classToAdd) => {
        bodyElement.classList.add(classToAdd);
    };
    const removeBodyClass = (classToRemove) => {
        bodyElement.classList.remove(classToRemove);
    };
    const setButtonClass = (button, classToRemove, classToAdd) => {
        if (classToRemove) {
            button.classList.remove(classToRemove);
        }
        if (classToAdd) {
            button.classList.add(classToAdd);
        }
    };
    const setMicrophoneButtonOn = () => {
        setButtonClass(microphoneButton, 'microphoneOff', 'microphoneOn');
        if (state.translations) {
            setButtonTitle(microphoneButton, state.translations.mute);
        }
    };
    const setMicrophoneButtonOff = () => {
        setButtonClass(microphoneButton, 'microphoneOn', 'microphoneOff');
        if (state.translations) {
            setButtonTitle(microphoneButton, state.translations.unmute);
        }
    };
    const setVideoButtonOn = () => {
        setButtonClass(videoButton, 'videoOff', 'videoOn');
        if (state.translations) {
            setButtonTitle(videoButton, state.translations.videoEnd);
        }
    };
    const setVideoButtonOff = () => {
        setButtonClass(videoButton, 'videoOn', 'videoOff');
        if (state.translations) {
            setButtonTitle(videoButton, state.translations.videoStart);
        }
    };
    const setSharingButtonOn = () => {
        setButtonClass(sharingButton, 'sharingStart', 'sharingStop');
        if (state.translations) {
            setButtonTitle(sharingButton, state.translations.sharingStop);
        }
    };
    const setSharingButtonOff = () => {
        setButtonClass(sharingButton, 'sharingStop', 'sharingStart');
        if (state.translations) {
            setButtonTitle(sharingButton, state.translations.sharingStart);
        }
    };
    const setButtonTitle = (button, title) => {
        button.setAttribute('title', title);
        const buttonTitle = button.querySelector('.title');
        if (buttonTitle) {
            buttonTitle.textContent = title;
        }
    };
    init();
})(CallMonitor || (CallMonitor = {}));
