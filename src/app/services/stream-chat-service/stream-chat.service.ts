import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject } from 'rxjs';
import { StreamChatMessage } from '../../model/stream-chat-message';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StreamChatService {
  private client: Client | null = null;

  private messagesSubject = new BehaviorSubject<StreamChatMessage[]>([]);
  messages$ = this.messagesSubject.asObservable();

  connect(videoId: number, onConnected?: () => void) {
    const base = environment.apiUrl.replace(/\/$/, ''); 
    const ws = base.replace(/^http/, 'ws') + '/ws'; 

    this.client = new Client({
      brokerURL: ws,
      reconnectDelay: 2000,
      onConnect: () => {
        this.client?.subscribe(`/topic/stream/${videoId}`, (msg: IMessage) => {
          const parsed = JSON.parse(msg.body);
          this.messagesSubject.next([...this.messagesSubject.value, parsed]);
        });
        onConnected?.();
      },
    });

    this.client.activate();
  }

  send(videoId: number, sender: string, content: string) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: `/app/stream/${videoId}/chat.send`,
      body: JSON.stringify({ sender, content }),
    });
  }

  disconnect() {
    this.messagesSubject.next([]);
    this.client?.deactivate();
    this.client = null;
  }
}
