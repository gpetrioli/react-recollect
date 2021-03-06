# React Recollect

**Featureless state management for React.**

What does 'featureless' mean? It means that Recollect has a tiny API with (almost) nothing to learn.

Recollect can replace Redux or MobX or similar state management libraries.

Have a play in this [Code Sandbox](https://codesandbox.io/s/lxy1mz200l).

## Warnings

There is no support for any version of IE, Opera mini, or Android browser 4.4 (because Recollect uses the `Proxy` object). Check out the latest usage stats at [caniuse.com](https://caniuse.com/#feat=proxy)

This tool is in its early days, so please test thoroughly and raise any issues you find.

If you need to compare the current and previous state of the store (e.g. to implement some sort of transition logic), Recollect may not be for you. Or you might need to do this outside of the Recollect store. (See [Immutability problems](#immutability-problems) below for more details.)

# Usage

## Installation

```
npm i react-recollect
```

## API

To use Recollect, you need to know about two things: the `store` object and the `collect` function.

### The `store` object

This is where all your data goes, obviously.

You can treat `store` just like you'd treat any JavaScript object, except you can't overwrite it.

```js
import { store } from 'react-recollect';

store.tasks = ['one', 'two', 'three']; // Fine

store.tasks.push('four'); // Good

if ('tasks' in store) // Nice one

delete store.tasks; // No problem

store = 'tasks'; // NOPE!
```

You can write to and read from this store object _anytime_, _anywhere_. Your React components will _always_ reflect the data in this store, provided they're wrapped in...

### The `collect` function

Wrap a React component in `collect` to have Recollect look after that component. If a component isn't wrapped in `collect`, it won't update when the store changes.

```jsx
import React from 'react';
import { collect, store } from 'react-recollect';
import Task from './Task';

const TaskList = () => (
  <div>
    {store.tasks.map(task => (
      <Task key={task.id} task={task} />
    ))}
    
    <button onClick={() => {
      store.tasks.push({
        name: 'A new task',
        done: false,
      });
    }}>
      Add a task
    </button>
  </div>
);

export default collect(TaskList);
```

Recollect will:
- Collect information about what data the component needs in order to render.
- When any of that data changes, Recollect will instruct React to re-render the component.

---

You've already finished learning `react-recollect`. Well done, you!

In addition to those two things, there's just one more thing you might like to know...

### The `afterChange` function

Pass a function to `afterChange` to have it called whenever the store updates. For example, if you wanted to sync your store to local storage, you could do the following (anywhere in your app).

```js
import { afterChange } from 'react-recollect';

afterChange(store => {
  localStorage.setItem('site-data', JSON.stringify(store));
});
```

Use this wisely as it will be called on _every_ change. If you're saving hundreds of kilobytes, hundreds of times per second, you might want to debounce.

## Peeking into Recollect's innards
Some neat things are exposed on `window.__RR__` for tinkering in the console.

- Use `__RR__.debugOn()` to turn on debugging. The setting is stored in local storage, so will persist while you sleep. You can combine this with Chrome's console filtering, for example to only see 'UPDATE' or 'SET' events. Who needs professional, well made dev tools extensions!
- Type `__RR__.debugOff()` and see what happens
- `__RR__.getStore()` returns a 'live' reference to the store. For example, typing `__RR__.getStore().tasks.pop()` in the console would actually delete a task from the store and Recollect would instruct React to re-render the appropriate components, `__RR__.getStore().tasks[1].done = true` would tick a tickbox, and so on.
- `__RR__.getListeners()` returns Recollect's list of component instances and the data they required the last time they rendered.

# Questions

## Can I use this with class-based components and functional components?

Yep and yep.

## Will component state still work?

Yep. Recollect has no effect on `setState` or the render cycle that it triggers.

## Do lifecycle methods still fire?

Yep. Recollect has no effect on `componentDidMount` and friends.

## Can I use this with `PureComponent` and `React.memo`?

That's the wrong question :)

When using React _without_ Recollect, React must assess each component to decide which ones it will re-render. `PureComponent` and `React.memo` are hints to React that say 'you won't need to update this component if its props and state are the same as last time'.

But Recollect does away with this roundabout method of 'working out' what to re-render. Instead it tells React _exactly_ which components it needs to re-render.

As a result, these 'hints' are of no benefit as performance enhancing methods.

## Can I use this with `shouldComponentUpdate()`?

Yes, but no, but you probably don't need to.

The [React docs](https://reactjs.org/docs/react-component.html#shouldcomponentupdate) say of `shouldComponentUpdate()`:

> This method only exists as a performance optimization. Do not rely on it to “prevent” a rendering, as this can lead to bugs ... In the future React may treat shouldComponentUpdate() as a hint rather than a strict directive, and returning false may still result in a re-rendering of the component

So, if you're using `shouldComponentUpdate` for _performance_ reasons, then you don't need it anymore. If the `shouldComponentUpdate` method is executing, it's because Recollect has _told_ React to update the component, which means a value that it needs to render has changed.

Unfortunately, the `prevProps` that you're going to get as the first argument are going to be wrong. See [Immutability problems](#immutability-problems) below for more details.

## Can I use this with `Context`?

Sorry, another wrong question.

Context is a way to share data across your components. But why would you bother when you have a global `store` object that you can write to and read from anywhere and any time.

## Can I have multiple stores?

You don't want multiple stores :)

There is no performance improvement to be had, so the desire for multiple stores is just an organizational preference. But objects already have a mechanism to organize their contents, they're called 'properties'.

# Immutability problems

Recollect does away with immutability for two reasons:
 - It doesn't need it. Recollect is far more precise than Redux when updating components, so React doesn't need to compare current/previous state to improve performance.
 - Immutability is the cause of too much complexity (and the bugs that go with it) for too little benefit. Just take a look at any reducer to see the cost of immutability.
 
With Recollect, your components will match your store, and that's all you need to know. 99% of the time.

But React brings immutability to the surface in three places:
- `componentDidUpdate`
- `shouldComponentUpdate`
- `getSnapshotBeforeUpdate` 

This is a problem when using Recollect, because the Recollect store is _always_ the Recollect store as it currently exists. You can't say "if the previous 'loadingStatus' was 'loading' and now it's 'complete', do something fancy", because there is no 'previous' and 'current' version of the store. 

Perhaps this is a blessing in disguise, because inferring state by comparing two different points in time is fiddly. The more declarative thing to do might be:

```js
const fetchData = async () => {
    store.loadingStatus = 'loading';
    
    const data = await fetchData();
    
    store.data = data;
    store.loadingStatus = 'justCompleted';
    
    setTimeout(() => {
      store.loadingStatus = null;
    }, 2000);
}
```

You can consider your components as being a visual representation of your state, and not triggering side effects based on transitions from one value to another.

Another example: rather than do as they suggest in the [React docs](https://reactjs.org/docs/react-component.html):

```js
componentDidUpdate(prevProps) {
  // Typical usage (don't forget to compare props):
  if (this.props.userID !== prevProps.userID) {
    this.fetchData(this.props.userID);
  }
}
```

Instead trigger the fetching of new data wherever it was that you updated the `userId`.

```js
const updateUserId = newId => {
  store.userId = newId;
  
  fetchUserdata(newId);
  
  // and the rest
}    
```

Lastly, if you're converting an existing component to use Recollect and really don't feel like re-architecting how things update, you can make a relatively small tweak and keep the rest of your logic the same, like
```js
class User extends Component {
  constructor(props) {
    super(props);

    this.prevUserId = props.userID;
  }

  componentDidUpdate() {
    if (this.prevUserId !== this.props.userID) {
      this.prevUserId = this.props.userID;
      this.fetchData(this.props.userID);
    }
  }

  render () { /* and the rest */ }
}
```

This whole immutability situation isn't great, and if it means you can't really get excited about Recollect I'll understand. It will be sad to see you go :(

In the future, Recollect may implement immutability if two things hold true:
- It doesn't increase complexity for the developer (I can do it under the hood)
- It doesn't have a negative impact on performance

# Dependencies

Recollect has a peer dependency of React, and needs at least version 15.3 (when `PureComponent` was released).

Recollect has no dependencies. :boom:

# Alternatives

If you want a library that guides you in structuring your app, use Redux.

If you want time travel, use Redux.

If you want explicit 'observables' and multiple stores, use MobX.

If you want nostalgia, use Flux.

Also there is a library that is very similar to this one (I didn't copy, promise) called [`react-easy-state`](https://github.com/solkimicreb/react-easy-state). It's more mature than this library, but _slightly_ more complex and has external dependencies.

# Is it really OK to drop support for IE?
Sure, why not! Just imagine, all that time you spend getting stuff to work for a few users in crappy old browsers could instead be spent making awesome new features for the vast majority of your users.

These websites have made the brave move and show a message saying they don't support IE:

- GitHub (owned by Microsoft!)
- devdocs.io 
- Flickr 
- Codepen

# TODO

- [ ] Check for differences between React 15's stack reconciler and 16's fibre reconciler.
- [ ] Investigate polyfilling/adaptation for IE11 and friends. I'm guessing it's slow.
- [ ] Investigate reading of props in constructor/lifecycle methods. Do these get recorded correctly? (Particularly componentDidMount.)
- [ ] Do away with that one line of JSX and then Babel? Check support for trailing commas, etc
- [ ] The `prevProps` passed to `componentDidUpdate()` will be wrong. I either need to proxied object to be immutable, or to somehow get just this value to be mutable (retain a reference to the previous props) only for components that use componentDidUpdate/shouldComponentUpdate. 
- [ ] Is `this.setState({})` better than `this.forceUpdate()`? 
