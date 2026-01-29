import { Injectable } from '@angular/core';
import { Client, IMessage, Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject } from 'rxjs';
import { StreamChatMessage } from '../../model/stream-chat-message';

import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class StreamChatService {
  private client: Client | null = null;

  private messagesSubject = new BehaviorSubject<StreamChatMessage[]>([]);
  messages$ = this.messagesSubject.asObservable();

  connect(videoId: number, onConnected?: () => void) {
 const wsUrl = environment.apiUrl.replace(/\/$/, '') + '/ws';

this.client = Stomp.over(() => new SockJS(wsUrl));
this.client.reconnectDelay = 2000;

this.client.onConnect = () => {
  this.client?.subscribe(`/topic/stream/${videoId}`, (msg: IMessage) => {
    const parsed = JSON.parse(msg.body);
    const current = this.messagesSubject.value;
    this.messagesSubject.next([...current, parsed]);
  });
  onConnected?.();
};

this.client.activate();

  }

  send(videoId: number, sender: string, content: string) {
    if (!this.client || !this.client.connected) return;
    const payload: Partial<StreamChatMessage> = { sender, content };

    // šalješ na /app/... (ApplicationDestinationPrefix = /app)
    this.client.publish({
      destination: `/app/stream/${videoId}/chat.send`,
      body: JSON.stringify(payload),
    });
  }

  disconnect() {
    this.messagesSubject.next([]); // reset poruka kad izađeš
    this.client?.deactivate();
    this.client = null;
  }
}
