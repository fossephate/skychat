import { Text, View, StyleSheet } from 'react-native';
import { ConvoManager } from '../../src';
import { useEffect, useState } from 'react';

// import { Calculator, type BinaryOperator, SafeAddition, ComputationResult } from '../../src';
// // A Rust object
// const calculator = new Calculator();
// // A Rust object implementing the Rust trait BinaryOperator
// const addOp = new SafeAddition();

// // A Typescript class, implementing BinaryOperator
// class SafeMultiply implements BinaryOperator {
//   perform(lhs: bigint, rhs: bigint): bigint {
//     return lhs * rhs;
//   }
// }
// const multOp = new SafeMultiply();

// // bigints
// const three = 3n;
// const seven = 7n;

// // Perform the calculation, and to get an object
// // representing the computation result.
// const computation: ComputationResult = calculator
//   .calculate(addOp, three, three)
//   .calculateMore(multOp, seven)
//   .lastResult()!;



function manual_chat(): string {
  // create alice and bob:
  let alice = new ConvoManager('alice');
  let bob = new ConvoManager('bob');
  let gn = "alice_group";
  let message_text = undefined;
  let serialized_message = undefined;
  let processed_results = undefined;
  let group_invite = undefined;
  let gid = undefined;

  let result = "";

  // alice creates a new group and invites bob:
  gid = alice.createNewGroup(gn);
  group_invite = alice.createInvite(gid, bob.getKeyPackage());
  console.log(group_invite);
  bob.processRawInvite(gn, group_invite.welcomeMessage, group_invite.ratchetTree, undefined);

  result += "\n<------ Alice creates a new group and invites Bob! ------->";

  // bob sends a message to alice:
  message_text = "Hello, alice!";
  result += `\nBob: ${message_text}`;
  serialized_message = bob.createMessage(gid, message_text);
  processed_results = alice.processMessage(serialized_message, undefined);
  result += `\nAlice decrypted: ${processed_results.message}`;

  // alice sends a message to bob:
  message_text = "Hello, bob!";
  result += `\nAlice: ${message_text}`;
  serialized_message = alice.createMessage(gid, message_text);
  processed_results = bob.processMessage(serialized_message, undefined);
  result += `\nBob decrypted: ${processed_results.message}`;

  // // charlie is created:
  let charlie = new ConvoManager('charlie');
  // and bob invites charlie:
  group_invite = bob.createInvite(gid, charlie.getKeyPackage());

  // charlie + everyone* (not actually everyone, but I think log(n) people in the tree?)
  // must process the invite before any new messages can be decrypted
  // (excluding bob since he created the invite)
  charlie.processRawInvite(gn, group_invite.welcomeMessage, group_invite.ratchetTree, undefined);
  // everyone* else must processes the fanned commit like a normal message
  alice.processMessage(group_invite.fanned as ArrayBuffer, undefined);

  result += "\n<------ Charlie enters the group! ------->";

  // charlie, now in the group, sends a message:
  message_text = "Hello, everyone!";
  result += `\nCharlie: ${message_text}`;
  serialized_message = charlie.createMessage(gid, message_text);

  // alice decrypts the message:
  processed_results = alice.processMessage(serialized_message, undefined);
  result += `\nAlice decrypted: ${processed_results.message}`;

  // bob decrypts the message:
  processed_results = bob.processMessage(serialized_message, undefined);
  result += `\nBob decrypted: ${processed_results.message}`;

  // bob responds:
  message_text = "Welcome, charlie!";
  result += `\nBob: ${message_text}`;
  serialized_message = bob.createMessage(gid, message_text);
  // charlie and alice decrypt the message:
  processed_results = alice.processMessage(serialized_message, undefined);
  result += `\nAlice decrypted: ${processed_results.message}`;
  processed_results = charlie.processMessage(serialized_message, undefined);
  result += `\nCharlie decrypted: ${processed_results.message}`;

  result += "\n<------ Charlie kicks Alice out of the group! ------->";
  // charlie kicks alice out of the group!:
  // let (fanned, welcome_option) = charlie.kickMember(gid, alice.getKeyPackage());

  // // bob processes the fanned commit:
  // bob.processMessage(fanned, undefined);

  // // charlie sends a message (to now just bob):
  // message_text = "Hello, (just) bob!";
  // console.log(`Charlie: ${message_text}`);
  // serialized_message = charlie.createMessage(gid, message_text);

  // // bob decrypts the message:
  // processed_results = bob.processMessage(serialized_message, undefined);
  // console.log(`Bob decrypted: ${processed_results.message}`);

  // here

  // // david requests to join the group:
  // let david = new ConvoManager('david');
  // console.log("<------ David created! ------->");
  // let epoch = charlie.getGroupEpoch(gid);
  // let serialized_proposal = david.requestJoin(gid, epoch);
  // console.log("<------ David requested to join the group! ------->");
  // console.log("<------ Bob allows David to join the group! ------->");
  // let proposed_invite = bob
  //     .processMessage(serialized_proposal.clone(), null)
  //     .invite
  //     .expect("invite not found");
  // console.log("<------ Bob processed the proposal! ------->");

  // console.log("<------ David joins the group! ------->");
  // // print the processed_results:
  // // println!("{}", format!("Processed results: {:?}", processed_results.invite.unwrap()).green());
  // david.processRawInvite(gn, proposed_invite.welcome_message, proposed_invite.ratchet_tree, null);
  // console.log("<------ David processed the invite! ------->");


  // charlie must also process the fanned commit:
  // charlie.process_message(proposed_invite.fanned.unwrap(), None);
  // charlie.process_message(serialized_proposal.clone(), None);
  // println!("<------ Charlie processed the invite! ------->");

  // // david sends a message:
  // let message_text = "Hello, (bob and charlie)!".to_string();
  // println!("{}", format!("David: {}", message_text).purple());
  // let serialized_message = david.create_message(&gid, message_text);
  // let processed_results = bob.process_message(serialized_message.clone(), None);
  // println!(
  //     "{}",
  //     format!("Bob decrypted: {}", processed_results.message.unwrap()).green()
  // );
  // let processed_results = charlie.process_message(serialized_message.clone(), None);
  // println!(
  //     "{}",
  //     format!("Charlie decrypted: {}", processed_results.message.unwrap()).green()
  // );

  // end of old code
  return result;
}

async function client_chat(): Promise<string> {
  // const convoManager = new ConvoManager('test');
  // convoManager.createNewGroup('test');
  return "test";
}

export default function App() {
  const result = manual_chat();
  const [chatLogs, setChatLogs] = useState<string>("");

  useEffect(() => {
    async function fetchLogs() {
      let logs = await client_chat();
      setChatLogs(logs);
    }
    fetchLogs();
  }, []);

  return (
    <View style={styles.container}>
      <Text>{result}</Text>
      <Text>{chatLogs}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
