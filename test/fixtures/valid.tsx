import React from 'react';

export class SlackApp extends React.Component<SimpleViewModel> {
  render() {
    const vm = this.viewModel;
    const shouldShift = vm.isOpen && window.outerWidth > window.outerHeight;

    return <MuiThemeProvider>
      <div style={{marginLeft: shouldShift ? '258px' : '0px', transition: 'margin-left: 450ms cubic-bezier(0.23, 1, 0.32, 1) 0ms'}}>
        <AppBar title='Trickline' onLeftIconButtonTouchTap={vm.toggleDrawer.bind()} zDepth={2}/>

        <Drawer open={vm.isOpen} zDepth={1}>
          <h2>I'm in the drawer</h2>
        </Drawer>

        <p>I am the main content</p>
      </div>
    </MuiThemeProvider>;
  }
}

export function HelloWorld ({name}) {
 return <div>{`Hi ${name}`}</div>;
};
