import type * as React from 'react';

declare global {
  namespace JSX {
    /* Ensure JSX namespace is available even when using the new JSX runtime */
    type Element = React.ReactElement<any, any>;
    interface ElementClass extends React.Component<any> {}
    interface ElementAttributesProperty {
      props: any;
    }
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
    interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
  }
}

export {};
