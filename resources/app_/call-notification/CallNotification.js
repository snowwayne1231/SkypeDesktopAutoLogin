var CallNotification;
(function (CallNotification) {
    const bodyElement = document.body;
    const avatarImage = document.getElementById('avatarImage');
    const avatarIcon = document.getElementById('avatarIcon');
    const acceptAudioButton = document.getElementById('acceptAudio');
    const rejectCallButton = document.getElementById('rejectCall');
    const acceptVideoButton = document.getElementById('acceptVideo');
    const mergeCallButton = document.getElementById('mergeCall');
    const messageElement = document.getElementById('message');
    const titleElement = document.getElementById('title');
    const init = () => {
        callNotificationApi.initFocusOutline();
        if (!callNotificationApi.supportsTransparency()) {
            setBodyClass('noTransparency');
        }
        if (callNotificationApi.isMac()) {
            setBodyClass('mac');
        }
        addClickEvent(acceptAudioButton, handleAcceptAudio);
        addClickEvent(acceptVideoButton, handleAcceptVideo);
        addClickEvent(rejectCallButton, handleReject);
        addClickEvent(mergeCallButton, handleMergeCall);
        bodyElement.addEventListener('click', handleClick);
        callNotificationApi.onMessage(onNewMessage);
        disableButton(mergeCallButton);
        sendMessage('ready');
    };
    const onNewMessage = (name, ...args) => {
        console.debug(`[CallNotificationPopup] Received message - name: ${name} args: ${JSON.stringify(args)}`);
        const handler = {
            update: onUpdate,
        };
        if (handler.hasOwnProperty(name)) {
            handler[name](...args);
        }
        else {
            console.error(`[CallNotificationPopup] Unhandled message: ${name}`);
        }
    };
    const handleReject = (e) => {
        e.stopPropagation();
        sendMessage('reject');
    };
    const handleAcceptAudio = (e) => {
        e.stopPropagation();
        sendMessage('acceptAudio');
    };
    const handleAcceptVideo = (e) => {
        e.stopPropagation();
        sendMessage('acceptVideo');
    };
    const handleMergeCall = (e) => {
        e.stopPropagation();
        sendMessage('mergeCall');
    };
    const handleClick = () => {
        sendMessage('click');
    };
    const onUpdate = (options) => {
        setButtonTitle(acceptAudioButton, options.acceptAudioLabel);
        setButtonTitle(acceptVideoButton, options.acceptVideoLabel);
        setButtonTitle(rejectCallButton, options.rejectLabel);
        setButtonTitle(mergeCallButton, options.mergeLabel);
        setText(messageElement, options.message);
        setText(titleElement, options.title);
        titleElement.setAttribute('aria-label', options.ariaLabel);
        if (options.avatarUrl) {
            updateAvatar(options.avatarUrl);
            avatarIcon.style.display = 'none';
        }
        else {
            avatarIcon.style.display = 'block';
        }
        if (options.isPstnCall && !options.isGroupCall) {
            updateAvatarToPSTN();
        }
        else if (options.isGroupCall) {
            updateAvatarToGroup();
        }
        if (options.video) {
            enableButton(acceptVideoButton);
        }
        else {
            disableButton(acceptVideoButton);
        }
        if (options.allowMerge) {
            enableButton(mergeCallButton);
        }
        else {
            disableButton(mergeCallButton);
        }
    };
    const sendMessage = (name, ...args) => {
        console.debug(`[CallNotificationPopup] Sending message - name: ${name} args: ${JSON.stringify(args)}`);
        callNotificationApi.sendMessage(name, ...args);
    };
    const addClickEvent = (element, handler) => {
        element.addEventListener('click', handler);
    };
    const setButtonClass = (button, classToRemove, classToAdd) => {
        button.classList.remove(classToRemove);
        button.classList.add(classToAdd);
    };
    const updateAvatar = (url) => {
        avatarImage.style.backgroundImage = 'url(' + url + ')';
    };
    const updateAvatarToPSTN = () => {
        setButtonClass(avatarIcon, 'oneToOne', 'pstn');
    };
    const updateAvatarToGroup = () => {
        setButtonClass(avatarIcon, 'oneToOne', 'group');
    };
    const enableButton = (button) => {
        button.style.display = 'block';
    };
    const disableButton = (button) => {
        button.style.display = 'none';
    };
    const setBodyClass = (classToAdd) => {
        bodyElement.classList.add(classToAdd);
    };
    const setText = (div, content) => {
        const text = div.querySelector('.text');
        if (text) {
            text.textContent = content;
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
})(CallNotification || (CallNotification = {}));
