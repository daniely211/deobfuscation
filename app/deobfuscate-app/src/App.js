import React, { useEffect } from 'react';
import './App.css';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import DeobfuscateTool from './DeobfuscateTool'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import rootReducer from './reducers'
const store = createStore(rootReducer)

export default function App() {
  return (
    <Provider store={store}>
      <DeobfuscateTool />
    </Provider>
  );
}

