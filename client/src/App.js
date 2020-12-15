import React, { Component } from "react";
import SolidityDriveContract from "./contracts/SolidityDrive.json";
import getWeb3 from "./getWeb3";
import { StyledDropZone } from "react-drop-zone"
import "react-drop-zone/dist/styles.css"
import "bootstrap/dist/css/bootstrap.css"
import {FileIcon, defaultStyles} from "react-file-icon"
import { Table } from "reactstrap"
import fileReaderPullStream from 'pull-file-reader'
import ipfs from './ipfs'
import moment from 'react-moment'

import "./App.css";
import Moment from "react-moment";

class App extends Component {
  state = { solidityDrive: [], web3: null, accounts: null, contract: null };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance. //getWeb3.js
      const web3 = await getWeb3(); //getting the instance that either injected from metamask or either ganache

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = SolidityDriveContract.networks[networkId];
      const instance = new web3.eth.Contract(
        SolidityDriveContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.getFiles); //setting the state
      web3.currentProvider.publicConfigStore.on('update', async () => { //whenever we have an update run this async function
        const changedAccounts = await web3.eth.getAccounts(); //get all the new accounts ordered and store it to changedAccounts
        this.setState({accounts : changedAccounts}); //setting the state accounts to the changedAccounts
        this.getFiles(); //calling the getFiles() to get the files for current account
      })
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  getFiles = async () => {
    //TODO
    try {
    //getting account and contract from state
    const { accounts, contract } = this.state;
    //getting the files length
    let filesLength = await contract.methods.getLength().call({from : accounts[0]});
    //an array to store files
    let files = [];
    //looping through file till filesLength
    for (let i = 0; i < filesLength; i++) {
      //getting the file from the contract and storing it to a variable
      let file = await contract.methods.getFile(i).call({from : accounts[0]})
      //pushing the file to the array
      files.push(file);
    }
    //setting the state to files which is an array
    this.setState({solidityDrive : files})
    } catch (error) {
      console.log(error)
    }
  };

  //whenever we call onDrop function we ll recieve a file, we ll receive this as we ll attach a onDrop to StyledDropZone
  //we ll drop the file and it ll get here, so now we have the file but in order to upload it to the IPFS network
  //we need to stream it as an array before, so this is why we have installed fileReaderPullStream
  onDrop = async (file) => {
    try {
      //getting account and contract from state
      const { contract, accounts } = this.state;
      //converting the file to stream in order to upload it to ipfs network
      const stream = fileReaderPullStream(file);
      //adding file to the ipfs and storing the result
      const result = await ipfs.add(stream);
      const timestamp = Math.round(+ new Date()/1000); //this is how you basically get unix timestamp
      const type = file.name.substr(file.name.lastIndexOf(".")+1); //This ll give us type of the file that we want to upload
      let uploaded = await contract.methods.add(result[0].hash, file.name, type, timestamp).send({from : accounts[0], gas : 300000}) 
      //In  debugger, In result we got an array of 0: hash:.., Path:.., Size:..
      console.log(uploaded);
      this.getFiles(); //fetching the files of current account again
    } catch (error) {
      console.log(error)
    }
  }

  render() {
    const {solidityDrive} = this.state; //importing solidityDrive state in render() so we can use it in return()
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <div className="container pt-3">
           {/*we are using this here as because onDrop function is attached to this App class,
            so in order to call it correctly we need to use this keyword*/}
        <StyledDropZone onDrop={this.onDrop}/>
        <Table>
          <thead>
            <tr>
              <th width="7%" scope="row">Type</th>
              <th className="text-left">File Name</th>
              <th className="text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {/*If solidityDrive state is not an empty array then iterate through solidityDrive using map(), item means file*/}
            {solidityDrive !== [] ? solidityDrive.map((item,key) => (
              <tr>
              <th>
                <FileIcon 
                    size={30} 
                    //from as the contract written, getFile returns each file hash at index 0, name at index 1, type at 2 and date at index 3
                    extension={item[2]} 
                    {...defaultStyles[item[2]]}/> {/*for styling*/}
              </th> 
              <th className="text-left"><a href={"https://ipfs.io/ipfs/"+item[0]}>{item[1]}</a></th> {/* Name with link*/}
            <th className="text-right"><Moment format="DD/MM/YYYY" unix>{item[3]}</Moment></th> {/*Without moment timestamp ll be in unix format*/}
            </tr>
            )): null } {/*If solidityDrive array is empty then show null that is nothing */}
          </tbody>
        </Table>
        </div>
      </div>
    );
  }
}

export default App;
