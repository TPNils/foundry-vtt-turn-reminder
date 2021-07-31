export namespace TurnReminder {
  export type MyItem = Item & {data: any};
  export type MyActor = Actor & {items: Map<string, MyItem>, data: any}
}