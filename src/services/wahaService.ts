import axios from 'axios';

const api = axios.create({
  baseURL: '/api/whatsapp',
});

export const wahaService = {
  async getStatus(name: string = 'default') {
    const response = await api.get('/status');
    return response.data;
  },

  async startInstance(name: string = 'default') {
    const response = await api.post('/start');
    return response.data;
  },

  async stopInstance(name: string = 'default') {
    const response = await api.post('/stop');
    return response.data;
  },

  async getChats(name: string = 'default') {
    const response = await api.get('/chats');
    return response.data;
  },

  async getMessages(name: string = 'default', chatId: string) {
    const response = await api.get('/messages', {
      params: { chatId, limit: 50 },
    });
    return response.data;
  },

  async sendMessage(name: string = 'default', chatId: string, text: string) {
    const response = await api.post('/messages/text', {
      chatId,
      text,
    });
    return response.data;
  },

  // Screenshot is now part of status in the new implementation
  async getScreenshot(name: string = 'default') {
    const status = await this.getStatus(name);
    return status.qr;
  }
};
