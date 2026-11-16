import { useEffect, useRef } from 'react';
import {
  Keyboard,
  ScrollView,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';

let active: (() => void) | null = null;

/** Called by Input on focus: moves the newly focused box above an open keyboard. */
export function revealFocusedInput() {
  setTimeout(() => active?.(), 80);
}

/** Space kept between the focused box and the top of the keyboard. */
const GAP = 24;

/**
 * ScrollView for forms: when the keyboard opens (or the focus moves while it
 * is open), it scrolls so the focused text box sits above the keyboard.
 * Android does not do this by itself in edge-to-edge apps. JS only.
 */
export function FormScrollView({ onScroll, children, ...rest }: ScrollViewProps) {
  const ref = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  const keyboardTop = useRef<number | null>(null);

  useEffect(() => {
    const reveal = () => {
      const top = keyboardTop.current;
      const input = TextInput.State.currentlyFocusedInput();
      if (top == null || !input) return;
      input.measureInWindow((_x, y, _w, h) => {
        const overlap = y + h + GAP - top;
        if (overlap > 0) {
          ref.current?.scrollTo({ y: offset.current + overlap, animated: true });
        }
      });
    };
    active = reveal;
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      // Let the KeyboardAvoidingView finish its layout first.
      setTimeout(reveal, 80);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
    });
    return () => {
      if (active === reveal) active = null;
      show.remove();
      hide.remove();
    };
  }, []);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  };

  return (
    <ScrollView
      ref={ref}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
