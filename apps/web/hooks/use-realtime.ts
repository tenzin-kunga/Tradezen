import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';

export function useRealtime(event: string, handler: (data: unknown) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const wrappedHandler = (data: unknown) => handlerRef.current(data);

    socket.on(event, wrappedHandler);
    return () => {
      socket.off(event, wrappedHandler);
    };
  }, [event]);
}
