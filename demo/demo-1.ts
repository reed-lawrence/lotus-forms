import { InputControl } from "../src";

const account_number = new InputControl({ selector: '#account-number', value: 'hello world', name: 'Account Number' });

account_number.$value().subscribe({ next: (value) => console.log(value) });