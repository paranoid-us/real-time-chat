const { createApp, ref, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const socket = io('http://localhost:3000');
    const username = ref('');
    const usernameInput = ref('');
    const showModal = ref(true);

    const messages = ref([]);
    const historyMessages = ref([]);
    const newMessage = ref('');
    const isTyping = ref(false);
    const socketId = ref('');
    const chatBox = ref(null);
    const currentTab = ref('chat');
    const darkMode = ref(true);
    let typingTimeout;

    const sendSound = new Audio('send.mp3');
    const receiveSound = new Audio('receive.mp3');

    function setUsername() {
      const value = usernameInput.value.trim();
      if (value) {
        username.value = value;
        localStorage.setItem("chatUsername", value);
        showModal.value = false;
        loadLocalHistory();
      }
    }
    function logout() {
      localStorage.removeItem("chatUsername");
      username.value = '';
      showModal.value = true;
    }


    function scrollToBottom() {
      nextTick(() => {
        if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
      });
    }

    function formatTime(ts) {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function toggleTheme() {
      darkMode.value = !darkMode.value;
      document.body.classList.toggle("light", !darkMode.value);
    }

    function switchTab(tab) {
      currentTab.value = tab;
      if (tab === 'history') {
        socket.emit('request-full-history');
      }
    }

    function sendMessage() {
      if (!newMessage.value.trim()) return;

      const message = {
        username: username.value,
        text: newMessage.value,
        time: Date.now(),
        id: socketId.value
      };

      socket.emit('send-message', message);
      messages.value.push(message);
      saveToLocal(message);
      sendSound.play();
      scrollToBottom();
      newMessage.value = '';
    }

    function saveToLocal(message) {
      const saved = JSON.parse(localStorage.getItem("chatHistory")) || [];
      saved.push(message);
      localStorage.setItem("chatHistory", JSON.stringify(saved));
    }

    function loadLocalHistory() {
      const saved = JSON.parse(localStorage.getItem("chatHistory")) || [];
      historyMessages.value = saved;
    }

    function notifyTyping() {
      socket.emit('typing');
    }

    onMounted(() => {
      const savedUsername = localStorage.getItem("chatUsername");
      if (savedUsername) {
        username.value = savedUsername;
        showModal.value = false;
        loadLocalHistory();
      }

      socket.on('connect', () => {
        socketId.value = socket.id;
        if (username.value) {
          socket.emit('join', username.value);
        }
      });

      socket.on('chat-history', (history) => {
        messages.value = history;
        scrollToBottom();
      });

      socket.on('receive-message', (msg) => {
        messages.value.push(msg);
        saveToLocal(msg);
        receiveSound.play();
        scrollToBottom();
      });

      socket.on('typing', () => {
        isTyping.value = true;
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          isTyping.value = false;
        }, 2000);
      });

      socket.on('full-history', (history) => {
        historyMessages.value = history;
      });
    });
    
    return {
      username,
      usernameInput,
      showModal,
      setUsername,
      logout,
      messages,
      historyMessages,
      newMessage,
      isTyping,
      socketId,
      chatBox,
      currentTab,
      darkMode,
      sendMessage,
      notifyTyping,
      formatTime,
      toggleTheme,
      switchTab
    };
  }
}).mount('#app');
