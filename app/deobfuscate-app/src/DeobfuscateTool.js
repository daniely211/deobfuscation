import React, { useEffect } from 'react';
import './App.css';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import StaticAnalysis from './components/StaticAnalysis'
import DynamicAnalysis from './components/DynamicAnalysis'
import JSConsole from './components/JSConsole'
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import CssBaseline from '@material-ui/core/CssBaseline';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Tree from '@naisutech/react-tree'
import { setStaticCode, setCodeTree, setOldCode, setReMountMergeCode, setSavedFiles } from './actions'
import { connect } from 'react-redux'

require('codemirror/lib/codemirror.css');
require('codemirror/theme/material.css');
require('codemirror/theme/neat.css');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');

const drawerWidth = 300;
let fetched = false
const useStyles = makeStyles((theme) => ({
  tabs: {
    // flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
  appBar: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginRight: drawerWidth,
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  drawerContainer: {
    overflow: 'auto',
  },
  content: {
    // flexGrow: 1,
    padding: theme.spacing(3),
    marginRight: drawerWidth,
    marginTop: '48px',
  },
}));

const parseTree = (node, parent=null) => {
  if (!node) {
    return []
  }
  const thisNode = {
    "id": node.id,
    "parentId": parent,
    "label": `${node.id}-${node.label}`
  }
  if (!node.children || (node.children && node.children.length == 0)) {
    return thisNode
  }

  let allID = [thisNode]

  node.children.forEach( (childNode) => {
    const childList = parseTree(childNode, node.id)
    allID = allID.concat(childList)
  })
  return allID
}
function TabPanel(props) {
  const { children, value, index } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
    >
      {value === index &&
        <React.Fragment>
          {children}
        </React.Fragment>
      }
    </div>
  );
}


function DeobfuscateTool(props) {
  const { saves, codeTree, setCode, code, setCodeTree, setOldCode, diff, setReMountMergeCode, setSavedFiles } = props
  const classes = useStyles();
  const [value, setValue] = React.useState(0);
  const [drawerTabValue, setDrawerTabValue] = React.useState(0);
  let url = window.location.href
  url = (url === 'http://localhost:3000/')? ' http://localhost:3001/': url


  const codeTreeTrans = parseTree(codeTree)
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  const handleDrawerTabsChange = (event, newValue) => {
    setDrawerTabValue(newValue);
  };
  
  const refreshHandler = (e) => {
    // if((e.metaKey && e.keyCode===82)) {
    //   if (window.confirm("Your work will be gone if you refresh")){
    //     window.location.reload()
    //   }
    // }
  }

  const clearHistory = () => {
    fetch(`${url}clearHistory`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
      .then(res => res.json())
      .then(json => {
        if (json && json.success){
          setCodeTree({});
        }

      }).catch(err => {
        throw(err)
      });
  
  }
  const loadFile = (filename) => {
    fetch(`${url}load`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: filename
        })
      })
      .then(res => res.json())
      .then(json => {
        console.log(json)
        if (json.codeTree){
          const codeTreeNew = JSON.parse(json.codeTree)
          setCodeTree(codeTreeNew);
        }
        if (json.source){
          setCode(json.source);
        }
      }).catch(err => {
        throw(err)
      });
  
  }

  const onSelectCodeID = (selectedNode, diff) => {
    fetch(`${url}getNode`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newId: selectedNode.id,
          diff: diff
        })
      })
      .then(res => res.json())
      .then(json => {
        if (json){
          const resultCode = json.source? json.source: code
          if (diff) {
            setReMountMergeCode()
            setOldCode(resultCode);
          } else {
            setCode(resultCode);
          }
        }
        
      }).catch(err => {
        setCode("Error in fetch");
        throw(err)
      });

  }

  useEffect(() => {
    // document.addEventListener('keydown', refreshHandler);
    // return function cleanup() {
    //   document.removeEventListener('keydown', refreshHandler);
    // };
    if (!fetched) {
      fetch(`${url}getHistory`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
      .then(res => res.json())
      .then(json => {
        fetched = true
        console.log(json)
        if (json.codeTree) {
          const codeTreeNew = JSON.parse(json.codeTree)
          setCodeTree(codeTreeNew)
        }
        if (json.source) {
          setCode(json.source)
        }
        if (json.listFiles && json.listFiles.length > 0) {
          console.log(json.listFiles)
          setSavedFiles(json.listFiles)
        }
      }).catch(err => {
        setCode("Error in fetch");
        throw(err)
      });
    }
    


  });

  function a11yProps(index) {
    return {
      id: `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  }

  return (
    <React.Fragment>
      <AppBar position="fixed" className={classes.appBar}>
        <Tabs value={value} onChange={handleChange} aria-label="simple tabs example">
          <Tab label="Static Analysis" {...a11yProps(0)} />
          {/* <Tab label="Dynamic Analysis" {...a11yProps(1)} /> */}
        </Tabs>
      </AppBar>
      <Drawer
        className={classes.drawer}
        variant="permanent"
        classes={{
          paper: classes.drawerPaper,
        }}
        anchor="right"
      >
        <Tabs value={drawerTabValue} onChange={handleDrawerTabsChange} >
          <Tab label="History" {...a11yProps(0)} />
          <Tab label="Saves" {...a11yProps(1)} />
        </Tabs>
        <TabPanel value={drawerTabValue} index={0}>
          <Toolbar />
          <div className={classes.drawerContainer}>
            <List>
              <ListItem key={"Clear History"} button onClick={() => clearHistory()}>
                  <ListItemText primary={"Clear"} />
                </ListItem>
                <ListItem key={"History"}>
                  <ListItemText primary={"History"} />
                </ListItem>
            </List>
            <Divider />
            <div style={{ width: drawerWidth, display: 'flex', flexGrow: 1 }}>
              <Tree nodes={codeTreeTrans} onSelect={(id) => onSelectCodeID(id, diff)} grow theme={'light'} size="half"/>
            </div>
          </div>
        </TabPanel>
        <TabPanel value={drawerTabValue} index={1}>
          <List>
            {saves.map(filename => (
              <ListItem key={filename} button onClick={() => loadFile(filename)}>
                <ListItemText primary={filename} />
              </ListItem>
            ))}

          </List>
        </TabPanel>

      </Drawer>
    <main className={classes.content}>
      <StaticAnalysis value={value} index={0}/>
      {/* <DynamicAnalysis value={value} index={1}/> */}
      {/* <JSConsole/> */}
    </main>
    </React.Fragment>
  );
}

const mapStateToProps = state => {
  const { codeTree, staticCode, diff, saves } = state.deobfuscation
  return ({
    codeTree: codeTree,
    code: staticCode,
    diff: diff,
    saves: saves
  })
}

const mapDispatchToProps = dispatch => ({
  setCode: (code) => dispatch(setStaticCode(code)),
  setCodeTree: (tree)=> dispatch(setCodeTree(tree)),
  setOldCode: (code) => dispatch(setOldCode(code)),
  setSavedFiles: (fileList) => dispatch(setSavedFiles(fileList)),
  setReMountMergeCode: () => dispatch(setReMountMergeCode()),
  
})

export default connect(mapStateToProps, mapDispatchToProps)(DeobfuscateTool)