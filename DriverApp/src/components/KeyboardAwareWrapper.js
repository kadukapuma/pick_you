import React from 'react';
import { Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const KeyboardAwareWrapper = ({ children, contentContainerStyle, ...props }) => {
  return (
    <KeyboardAwareScrollView
      contentContainerStyle={contentContainerStyle}
      enableOnAndroid={true}
      extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
      keyboardOpeningTime={0}
      enableAutomaticScroll={true}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
};

export default KeyboardAwareWrapper;
