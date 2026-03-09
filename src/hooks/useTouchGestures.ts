import { useRef, useCallback } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
  onDoubleTap?: () => void;
  swipeThreshold?: number;
  pinchThreshold?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startDistance: number;
  startTime: number;
  lastTapTime: number;
}

export function useTouchGestures(options: TouchGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchIn,
    onPinchOut,
    onDoubleTap,
    swipeThreshold = 50,
    pinchThreshold = 0.2,
  } = options;

  const touchState = useRef<TouchState>({
    startX: 0,
    startY: 0,
    startDistance: 0,
    startTime: 0,
    lastTapTime: 0,
  });

  const getDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const touch0 = touches.item(0);
    const touch1 = touches.item(1);
    if (!touch0 || !touch1) return 0;
    const dx = touch0.clientX - touch1.clientX;
    const dy = touch0.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchState.current.startX = touch.clientX;
    touchState.current.startY = touch.clientY;
    touchState.current.startTime = Date.now();

    // Pinch detection
    if (e.touches.length === 2) {
      touchState.current.startDistance = getDistance(e.touches);
    }

    // Double tap detection
    const now = Date.now();
    const timeSinceLastTap = now - touchState.current.lastTapTime;
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0 && e.touches.length === 1) {
      onDoubleTap?.();
    }
    touchState.current.lastTapTime = now;
  }, [onDoubleTap]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Pinch gesture
    if (e.touches.length === 2 && touchState.current.startDistance > 0) {
      const currentDistance = getDistance(e.touches);
      const ratio = currentDistance / touchState.current.startDistance;

      if (ratio > 1 + pinchThreshold) {
        onPinchOut?.();
        touchState.current.startDistance = currentDistance;
      } else if (ratio < 1 - pinchThreshold) {
        onPinchIn?.();
        touchState.current.startDistance = currentDistance;
      }
    }
  }, [onPinchIn, onPinchOut, pinchThreshold]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.changedTouches.length === 0) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchState.current.startX;
    const deltaY = touch.clientY - touchState.current.startY;
    const deltaTime = Date.now() - touchState.current.startTime;

    // Only detect swipe if it was a quick gesture (< 300ms)
    if (deltaTime > 300) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Horizontal swipe
    if (absX > swipeThreshold && absX > absY) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
    // Vertical swipe
    else if (absY > swipeThreshold && absY > absX) {
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }

    // Reset pinch distance
    touchState.current.startDistance = 0;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold]);

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

export default useTouchGestures;
