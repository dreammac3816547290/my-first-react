// Run this example by adding <%= javascript_pack_tag 'hello_react' %> to the head of your layout file,
// like app/views/layouts/application.html.erb. All it does is render <div>Hello React</div> at the bottom
// of the page.

import React from 'react'
import ReactDOM from 'react-dom'
import '../../assets/stylesheets/style.css'

function brighten(scale, translate) {
  function bright(value) {
    return Math.max(0, Math.min(255, Math.floor(value * scale + translate)));
  }
  return hex => "#" + [hex.substr(1, 2), hex.substr(3, 2), hex.substr(5, 2)].map(a => bright(parseInt(a, 16)).toString(16)).map(a => a.length === 2 ? a : "0" + a).join("");
}
function keyGen(label, start = 0) {
  let a = 0;
  return () => label + a++;
}
function keyIndex(key) {
  return parseInt(key.split(" ")[1]);
}
let formKey = keyGen("Form ");
let tagKey = keyGen("Tag ");
let folderKey = keyGen("Folder ");
let scheduleKey = keyGen("Schedule ");
let reminderKey = keyGen("Reminder ");
let linkKey = keyGen("Link ");
function form() { // add details
  return {component: Form, props: {key: formKey(), label: "", description: "", selectTags: new Set(), schedules: [], reminders: [], links: [], priority: 0, bgcolor: "#000000", textcolor: "#FFFFFF"}}; // tags = Set?
}
function tag() {
  return {component: Tag, props: {key: tagKey(), label: "", bgcolor: "#FFFFFF", textcolor: "#000000"}};
}
function position(conwidth, width, horizontal, y,  vertical) { // conwidth = container width, width = item width, horizontal = horizontal distance, y = y offset, vertical = vertical distance
  const col = Math.floor((conwidth + width) / horizontal) - 1;
  function pos(index) {
    const top = y + vertical * Math.floor(index / col);
    const left = (conwidth - width - horizontal * (col - 1)) / 2 + horizontal * (index % col);
    return [top, left];
  }
  return pos;
}
function value(event, name) {
  return window.getComputedStyle(event.target).getPropertyValue(name);
}
function calculateStart(reminder) {
  let date = new Date(reminder.start);
  function inc() {
    const addYear = Math.floor((date.getMonth() + parseInt(reminder.month)) / 12);
    date.setMonth((date.getMonth() + parseInt(reminder.month)) % 12);
    date.setYear(date.getFullYear() + parseInt(reminder.year) + addYear);
    date = new Date(date.getTime() + parseInt(reminder.week) * 604800000 + parseInt(reminder.day) * 86400000 + parseInt(reminder.hour) * 3600000 + parseInt(reminder.minute) * 60000);
  }
  while(date.getTime() < Date.now()) {
    inc();
  }
  return date.getTime() - Date.now();
}
const bright = brighten(2, 50); // @@@ modify brighten
const dark = brighten(0.8, 0); // @@@ modify
function radial(color) {
  return `radial-gradient(at 0% 100%, ${bright(color)}, ${color})`;
}
class Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {account: null, feature: false, sign: {username: "", password: ""}, search: {state: false, label: "", description: "", selectTags: new Set()}, display: null, add: null, tags: new Map(), tasks: new Map(), pending: new Map(), blocks: []}; // add details; notifications = Map?; on task delete, clear block; on tag delete, clear tasks tag
    this.check = this.check.bind(this);
    this.load = this.load.bind(this);
    this.delete = this.delete.bind(this);
    this.update = this.update.bind(this);
    this.display = this.display.bind(this);
    this.pending = this.pending.bind(this);
    this.change = this.change.bind(this);
    this.formChangeTags = this.formChangeTags.bind(this);
    this.scheduleAdd = this.scheduleAdd.bind(this);
    this.scheduleChange = this.scheduleChange.bind(this);
    this.scheduleDelete = this.scheduleDelete.bind(this);
    this.reminderAdd = this.reminderAdd.bind(this);
    this.reminderChange = this.reminderChange.bind(this);
    this.reminderDelete = this.reminderDelete.bind(this);
    this.linkAdd = this.linkAdd.bind(this);
    this.linkChange = this.linkChange.bind(this);
    this.linkDelete = this.linkDelete.bind(this);
    this.formCancel = this.formCancel.bind(this);
    this.formSubmit = this.formSubmit.bind(this);
    this.tagSubmit = this.tagSubmit.bind(this);
    this.taskFilter = this.taskFilter.bind(this);
  }
  componentDidMount() {
    const name = localStorage.getItem("name");
    if (name) {
      this.setState({sign: {username: name, password: localStorage.getItem("password")}})
      this.load();
    }
  }
  componentDidUpdate() {
    if (this.state.account) {
      this.delete();
      this.update();
    }
  }
  check() {
    const url = "api/v1/users/index";
    fetch(url)
    .then((data) => {
      if (data.ok) {
        return data.json();
      }
      throw new Error("Network error.");})
    .then((data) => {
      return data.find((user) => user.name === this.state.sign.username);
    }).catch((err) => message.error("Error: " + err));
  }
  load() {
    const url = "api/v1/users/index";
    fetch(url)
    .then((data) => {
      if (data.ok) {
        return data.json();
      }
      throw new Error("Network error.");})
    .then((data) => {
      const user = data.find((user) => user.name === this.state.sign.username && user.password === this.state.sign.password);
      if (user) {
        const tags = new Map(user.tags.split("~").map(tag => {
          const props = tag.split("%");
          return [props[0], {component: Tag, props: {key: props[0], label: props[1], bgcolor: props[2], textcolor: props[3]}}];
        }));
        const tasks = new Map(user.tasks.split("~").map(task => {
          const props = task.split("%");
          const schedules = props[4].split("$").map(schedule => {
            const a = schedule.split(">");
            return {key: a[0], from: a[1], to: a[2], year: parseInt(a[3]), month: parseInt(a[4]), week: parseInt(a[5]), day: parseInt(a[6]), hour: parseInt(a[7]), minute: parseInt(a[8])};
          });
          const reminders = props[5].split("$").map(reminder => {
            const a = reminder.split(">");
            return {key: a[0], start: a[1], year: parseInt(a[2]), month: parseInt(a[3]), week: parseInt(a[4]), day: parseInt(a[5]), hour: parseInt(a[6]), minute: parseInt(a[7])};
          });
          const links = props[6].split("$").map(link => {
            const a = link.split(">");
            return {key: a[0], label: a[1], address: a[2]};
          });
          return [props[0], {component: Form, props: {key: props[0], label: props[1], description: props[2], selectTags: new Set(props[3].split("$")), schedules: schedules, reminders: reminders, links: links, priority: parseInt(props[7]), bgcolor: props[8], textcolor: props[9]}}];
        }));
        const pending = new Map(user.pending.split("~").map(pending => {
          const props = pending.split("%");
          const schedules = props[4].split("$").map(schedule => {
            const a = schedule.split(">");
            return {key: a[0], from: a[1], to: a[2], year: parseInt(a[3]), month: parseInt(a[4]), week: parseInt(a[5]), day: parseInt(a[6]), hour: parseInt(a[7]), minute: parseInt(a[8])};
          });
          const reminders = props[5].split("$").map(reminder => {
            const a = reminder.split(">");
            return {key: a[0], start: a[1], year: parseInt(a[2]), month: parseInt(a[3]), week: parseInt(a[4]), day: parseInt(a[5]), hour: parseInt(a[6]), minute: parseInt(a[7])};
          });
          const links = props[6].split("$").map(link => {
            const a = link.split(">");
            return {key: a[0], label: a[1], address: a[2]};
          });
          return [props[0], {component: Form, props: {key: props[0], label: props[1], description: props[2], selectTags: new Set(props[3].split("$")), schedules: schedules, reminders: reminders, links: links, priority: parseInt(props[7]), bgcolor: props[8], textcolor: props[9]}}];
        }));
        const blocks = user.blocks.split("~").map(block => {
          const props = block.split("%");
          if (props.length === 1) {
            return block;
          } else {
            return {key: props[0], label: props[1], description: props[2], tasks: props[3].split("$")};
          }
        });
        function loadKey() {
          const tasks = [...this.state.tasks.values(), ...this.state.pending.values()]
          formKey = keyGen("Form ", Math.max(-1, tasks.map(task => keyIndex(task.props.key))) + 1);
          tagKey = keyGen("Tag ", Math.max(-1, ...[...this.state.tags.values()].map(tag => keyIndex(tag.props.key))) + 1);
          folderKey = keyGen("Folder ", Math.max(-1, this.state.blocks.filter(block => typeof block === "object").map(block => keyIndex(block.key))) + 1);
          scheduleKey = keyGen("Schedule ", Math.max(-1, tasks.map(task => Math.max(-1, ...task.props.schedules.map(schedule => keyIndex(schedule.key))))) + 1);
          reminderKey = keyGen("Reminder ", Math.max(-1, tasks.map(task => Math.max(-1, ...task.props.reminders.map(reminder => keyIndex(reminder.key))))) + 1);
          linkKey = keyGen("Link ", Math.max(-1, tasks.map(task => Math.max(-1, ...task.props.links.map(link => keyIndex(link.key))))) + 1);
        }
        this.setState({account: {name: user.name, password: user.password}, tags: tags, tasks: tasks, pending: pending, blocks: blocks}, loadKey);
        localStorage.setItem("name", user.name);
        localStorage.setItem("password", user.password);
      }
    }).catch((err) => message.error("Error: " + err));
  }
  delete() {
    let url = "api/v1/users/index";
    let id;
    fetch(url)
    .then((data) => {
      if (data.ok) {
        return data.json();
      }
      throw new Error("Network error.");})
    .then((data) => {
      const user = data.find((user) => user.name === this.state.sign.username);
      id = user.id;
    }).catch((err) => message.error("Error: " + err));
    url = `api/v1/users/${id}`;
    fetch(url, {
      method: "delete",
    })
      .then((data) => {
        if (data.ok) {
          return data.json();
        }
        throw new Error("Network error.");
      })
      .catch((err) => message.error("Error: " + err));
  }
  update() {
    const url = "api/v1/users/";
    const data = {name: this.state.account.name, password: this.state.account.password};
    
    data.tags = [...this.state.tags.values()].map(tag => [tag.props.key, tag.props.label, tag.props.bgcolor, tag.props.textcolor].join("%")).join("~");
    
    data.tasks = [...this.state.tasks.values()].map(task => task.props).map(props => [props.key, props.label, props.description, [...props.selectTags.values()].join("$"),
      props.schedules.map(schedule => [schedule.key, schedule.from, schedule.to, schedule.year, schedule.month, schedule.week, schedule.day, schedule.hour, schedule.minute].join(">")).join("$"),
      props.reminders.map(reminder => [reminder.key, reminder.start, reminder.year, reminder.month, reminder.week, reminder.day, reminder.hour, reminder.minute].join(">")).join("$"),
      props.links.map(link => [link.key, link.label, link.address].join(">")).join("$"),
    props.priority, props.bgcolor, props.textcolor].join("%")).join("~");
    
    data.pending = [...this.state.pending.values()].map(pending => pending.props).map(props => [props.key, props.label, props.description, [...props.selectTags.values()].join("$"),
      props.schedules.map(schedule => [schedule.key, schedule.from, schedule.to, schedule.year, schedule.month, schedule.week, schedule.day, schedule.hour, schedule.minute].join(">")).join("$"),
      props.reminders.map(reminder => [reminder.key, reminder.start, reminder.year, reminder.month, reminder.week, reminder.day, reminder.hour, reminder.minute].join(">")).join("$"),
      props.links.map(link => [link.key, link.label, link.address].join(">")).join("$"),
    props.priority, props.bgcolor, props.textcolor].join("%")).join("~");
      
    data.blocks = this.state.blocks.map(block => typeof block === "object" ? [block.key, block.label, block.description, block.tasks.join("$")].join("%") : block).join("~");
    
    fetch(url, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    .then((data) => {
      if (data.ok) {
        return data.json();
      }
      throw new Error("Network error.");
    })
    .catch((err) => console.error("Error: " + err));
  }
  display(object) {
    let add;
    switch(object.component) {
      case Form:
        add = {onChange: this.change, tags: this.state.tags, changeTags: this.formChangeTags, scheduleAdd: this.scheduleAdd, scheduleChange: this.scheduleChange, scheduleDelete: this.scheduleDelete, reminderAdd: this.reminderAdd, reminderChange: this.reminderChange, reminderDelete: this.reminderDelete, linkAdd: this.linkAdd, linkChange: this.linkChange, linkDelete: this.linkDelete, cancel: this.formCancel, submit: this.formSubmit};
        break;
      case Tag:
        add = {onChange: this.change, submit: this.tagSubmit};
        break;
      default:
    }
    this.setState({display: object, add: add}); // the object has a function component and props including key; update display object on form change; display task from schedule
  }
  pending() { // active on notification click too
    const display = this.state.display; // >>> clone?
    if (display.component === Form) {
      const pending = new Map(this.state.pending);
      const key = display.props.key;
      if (pending.has(key) || this.state.tasks.has(key) ? true : true) { // first true: if task is changed, second true: if unassigned is not empty; pending open on task "modify"
        pending.set(key, display);
        this.setState({pending: pending});
      }
    }
    this.setState({display: null, add: null});
  }
  change(event) { // modify for schedule, reminder, etc
    const display = {...this.state.display, props: {...this.state.display.props, [event.target.name]: event.target.value}};
    this.setState({display: display});
  }
  formChangeTags(key) {
    const selectTags = new Set(this.state.display.props.selectTags);
    if (selectTags.has(key)) {
      selectTags.delete(key);
    } else {
      selectTags.add(key);
    }
    const display = {...this.state.display, props: {...this.state.display.props, selectTags: selectTags}};
    this.setState({display: display});
  }
  scheduleAdd() {
    const props = this.state.display.props;
    const display = {...this.state.display, props: {...props, schedules: props.schedules.concat({key: scheduleKey(), from: 	"2022-01-25", to: "2022-01-25", year: 0, month: 0, week: 0, day: 0, hour: 0, minute: 0})}}; // modify initial from & to
    this.setState({display: display});
  }
  scheduleChange(index, event) {
    const schedules = [...this.state.display.props.schedules];
    schedules.splice(index, 1, {...schedules[index], [event.target.name]: event.target.value});
    const display = {...this.state.display, props: {...this.state.display.props, schedules: schedules}};
    this.setState({display: display});
  }
  scheduleDelete(index) {
    const schedules = [...this.state.display.props.schedules];
    schedules.splice(index, 1);
    const display = {...this.state.display, props: {...this.state.display.props, schedules: schedules}};
    this.setState({display: display});
  }
  reminderAdd() {
    const props = this.state.display.props;
    const display = {...this.state.display, props: {...props, reminders: props.reminders.concat({key: reminderKey(), start: "2022-01-25", year: 0, month: 0, week: 0, day: 0, hour: 0, minute: 0})}}; // modify initial start
    this.setState({display: display});
  }
  reminderChange(index, event) {
    const reminders = [...this.state.display.props.reminders];
    reminders.splice(index, 1, {...reminders[index], [event.target.name]: event.target.value});
    const display = {...this.state.display, props: {...this.state.display.props, reminders: reminders}};
    this.setState({display: display});
  }
  reminderDelete(index) {
    const reminders = [...this.state.display.props.reminders];
    reminders.splice(index, 1);
    const display = {...this.state.display, props: {...this.state.display.props, reminders: reminders}};
    this.setState({display: display});
  }
  linkAdd() {
    const props = this.state.display.props;
    const display = {...this.state.display, props: {...props, links: props.links.concat({key: linkKey(), label: "", address: ""})}};
    this.setState({display: display});
  }
  linkChange(index, event) {
    const links = [...this.state.display.props.links];
    links.splice(index, 1, {...links[index], [event.target.name]: event.target.value});
    const display = {...this.state.display, props: {...this.state.display.props, links: links}};
    this.setState({display: display});
  }
  linkDelete(index) {
    const links = [...this.state.display.props.links];
    links.splice(index, 1);
    const display = {...this.state.display, props: {...this.state.display.props, links: links}};
    this.setState({display: display});
  }
  formCancel() { // form cancel only delete display & pending, task cancel delete task
    const pending = new Map(this.state.pending);
    pending.delete(this.state.display.props.key);
    this.setState({display: null, add: null, pending: pending});
  }
  formSubmit() { // empty?
    const display = this.state.display; // necessary?; change component from Form (to Task?) // >>> clone?
    const key = display.props.key;
    const tasks = new Map(this.state.tasks);
    if (!tasks.has(key)) {
      this.setState({blocks: this.state.blocks.concat(key)});
    }
    tasks.set(key, display);
    const pending = new Map(this.state.pending);
    pending.delete(key);
    this.setState({display: null, add: null, tasks: tasks, pending: pending});
  }
  tagSubmit() {
    const display = this.state.display;
    const key = display.props.key;
    const tags = new Map(this.state.tags);
    tags.set(key, display);
    this.setState({display: null, add: null, tags: tags});
  }
  taskFilter() {
    if (!this.state.search.state) {
      return this.state.blocks;
    }
    const tasks = this.state.tasks;
    const keys = [...tasks.keys()];
    const filter = this.state.search.state
      ? keys.filter((key) => {
        const props = tasks.get(key).props;
        const search = this.state.search;
        return props.label.toLowerCase().includes(search.label.toLowerCase()) && props.description.toLowerCase().includes(search.description.toLowerCase()) && [...search.selectTags.values()].every((tag) => props.selectTags.has(tag))})
      : keys;
    return filter;
  }
  render() {
    const display = this.state.display;
    const reminders = [].concat(...[...this.state.tasks.values()].map((task) => task.props.reminders)).filter((reminder) => !(reminder.year === 0 && reminder.month === 0 && reminder.week === 0 && reminder.day === 0 && reminder.hour === 0 && reminder.minute === 0 && new Date(reminder.start).getTime() < Date.now()));
    return (
      <div id="page">
        <div id="content">
          <Feature state={this.state} setState={this.setState.bind(this)} display={this.display} check={this.check} load={this.load} update={this.update}/>
          <Container state={this.state} setState={this.setState.bind(this)} display={this.display} blocks={this.taskFilter()}/>
        </div>
        <div id="dark-1" class={display ? "dim" : "bright"} onClick={this.pending}></div>
        {display && React.createElement(display.component, {...display.props, ...this.state.add})}
        {reminders.map(reminder => <Timer {...reminder}/>)}
      </div>); // {this.state.notifications}; display.component({...display.props, ...this.state.add}); key for Timer?
  }
}
class Feature extends React.Component {
  constructor(props) {
    super(props);
    this.state = {sign: false, search: false};
  }
  changeTags(key) {
    const search = this.props.state.search;
    const selectTags = new Set(search.selectTags);
    if (selectTags.has(key)) {
      selectTags.delete(key);
    } else {
      selectTags.add(key);
    }
    this.props.setState({search: {...search, selectTags: selectTags}});
  }
  render() {
    const search = this.props.state.search;
    return (
      <div id="feature" style={{width: this.props.state.feature ? 400 : 0}}>
        <div class="feature-label" onClick={() => this.setState({sign: !this.state.sign})}>
          Sign In
        </div>
        <div id="sign" style={{height: this.state.sign ? 300 : 0}}>
          <input type="text" placeholder="Username" onChange={(event) => this.props.setState({sign: {...this.props.state.sign, username: event.target.value}})}/>
          <input type="password" placeholder="Password" onChange={(event) => this.props.setState({sign: {...this.props.state.sign, password: event.target.value}})}/>
          <button onClick={() => this.props.load()}>Sign In</button>
          <button onClick={() => this.props.check() ? this.props.update() : {}}>Sign Up</button>
          <button onClick={() => {this.props.setState({account: null}); localStorage.removeItem("name"); localStorage.removeItem("password");}}>Sign Out</button>
        </div>
        <div class="feature-label" onClick={() => this.setState({search: !this.state.search})}>
          Search
          <button onClick={(event) => {event.stopPropagation(); this.props.setState({search: {...search, state: !search.state}})}}>{search.state ? "On" : "Off"}</button>
        </div>
        <div id="search" style={{height: this.state.search ? 300 : 0}}>
          <input type="text" placeholder="Label" onChange={(event) => this.props.setState({search: {...search, label: event.target.value}})}/>
          <input type="text" placeholder="Description"onChange={(event) => this.props.setState({search: {...search, description: event.target.value}})}/>
          Tags
          <button id="add-tag" onClick={() => this.props.display(tag())}>+</button>
          <div id="feature-tag-container">
            {[...this.props.state.tags.entries()].map((pair) => {
              const select = search.selectTags.has(pair[0]);
              return (
                <div class="feature-tag" key={pair[0]} style={{"--dark": select ? "#000000" : dark(pair[1].props.bgcolor), background: select ? "#000000" : pair[1].props.bgcolor, color: select ? "#FFFFFF" : pair[1].props.textcolor}} onClick={() => this.changeTags(pair[0])} onContextMenu={(event) => {event.preventDefault(); this.props.display(pair[1]);}}>
                  <div class="feature-tag-text">
                    {pair[1].props.label}
                  </div>
                  <button class="tag-delete" style={{color: select ? "#FFFFFF" : "#000000"}} onClick={(event) => {event.stopPropagation(); const tags = new Map(this.props.state.tags); tags.delete(pair[0]); this.props.setState({tags: tags});}}>✖</button>
                </div>
            )})}
          </div>
        </div>
      </div>);
  }
}
class Container extends React.Component {
  constructor(props) {
    super(props);
    this.drag = this.drag.bind(this);
    this.dragOver = this.dragOver.bind(this);
    this.blockDrop = this.blockDrop.bind(this);
  }
  drag(event) { // folder?
    event.dataTransfer.setData("text", value(event, "--id"));
  }
  dragOver(event) {
    event.preventDefault();
  }
  blockDrop(event) {
    const target = value(event, "--id");
    const drag = event.dataTransfer.getData("text");
    console.log(target, drag);
    if (target !== drag) { // or if drag is task in target folder
      event.preventDefault();
      const blocks = [...this.props.state.blocks];
      const dragIndex = blocks.indexOf(drag);
      if (dragIndex === -1) { // drag in folder
        const folderIndex = blocks.findIndex(block => typeof block === "object" && block.tasks.includes(drag));
        const tasks = [...blocks[folderIndex].tasks];
        tasks.splice(tasks.indexOf(drag), 1);
        if (tasks.length === 1) {
          blocks[folderIndex] = tasks[0];
        } else {
          blocks[folderIndex] = {...blocks[folderIndex], tasks: tasks};
        }
      } else {
        blocks.splice(dragIndex, 1);
      }
      if (target.split(" ")[0] === "Folder") {
        const index = blocks.findIndex(block => block.key === target);
        const folder = {...blocks[index], tasks: blocks[index].tasks.concat(drag)};
        blocks[index] = folder;
      } else {
        const folder = {key: folderKey(), label: "New Folder", description: "", tasks: [target, drag]};
        blocks[blocks.indexOf(target)] = folder;
      }
      this.props.setState({blocks: blocks});
    }
  }
  priorityChange(key, event) {
    const tasks = new Map(this.props.state.tasks);
    let task = tasks.get(key);
    task = {...task, props: {...task.props, priority: event.target.value}};
    tasks.set(key, task);
    this.props.setState({tasks: tasks});
  }
  render() {
    const state = this.props.state;
    const calc = position(innerWidth - (state.feature ? 400 : 0), 200, 240, 50, 240); // modify, conwidth = innerWidth - feature width
    const width = Math.min(200, innerWidth / state.pending.size); // modify
    return ( // modify feature-expand tag
      <div id="container">
        <div id="task-container">
          {this.props.blocks.map((block, index) => {
            const pos = calc(index);
            if (typeof block === "object") {
              return (
                <div class="folder" key={block.key} style={{"--id": block.key, "--height": 200 + "px", top: pos[0], left: pos[1]}} onDragOver={this.dragOver} onDrop={this.blockDrop}>
                  <div class="folder-front">
                    {block.label}
                  </div>
                  <div class="folder-body">
                    {block.tasks.map((key) => {
                      const task = state.tasks.get(key);
                      return (
                        <div class="folder-task" key={key} style={{"--id": key, "--height": 40 + "px"}} onClick={() => this.props.display(task)} draggable="true" onDragStart={this.drag}>
                          <div class="folder-task-header" style={{background: radial(task.props.bgcolor), color: task.props.textcolor}}>
                            {task.props.label}
                          </div>
                          <div class="folder-task-body">
                            <input type="range" value={task.props.priority} onChange={this.priorityChange.bind(this, key)} onMouseDown={(event) => {event.target.parentNode.parentNode.draggable = false;}} onMouseUp={(event) => {event.target.parentNode.parentNode.draggable = true;}} onClick={(event) => event.stopPropagation()}/>
                            {task.props.description}
                          </div>
                        </div>
                    )})}
                  </div>
                </div>);
            } else {
              const task = state.tasks.get(block);
              return ( // modify block onClick; block style changes ondragover
                <div class="block" key={block} style={{"--id": block, "--height": 200 + "px", "--top": pos[0] + "px", top: pos[0] + "px", left: pos[1]}} onClick={() => this.props.display(task)} draggable="true" onDragStart={this.drag} onDragOver={this.dragOver} onDrop={this.blockDrop}>
                  <div class="block-header" style={{background: radial(task.props.bgcolor), color: task.props.textcolor}}>
                    {task.props.label}
                  </div>
                  <div class="block-body">
                    <input type="range" value={task.props.priority} onChange={this.priorityChange.bind(this, block)} onMouseDown={(event) => {event.target.parentNode.parentNode.draggable = false;}} onMouseUp={(event) => {event.target.parentNode.parentNode.draggable = true;}} onClick={(event) => event.stopPropagation()}/>
                    {task.props.description}
                  </div>
                </div>);
            };
          }).reverse()}
        </div>
        <a id="feature-expand" onClick={() => this.props.setState({feature: !state.feature})}>{state.feature ? "❰" : "❱"}</a>
        <div id="add-container"><button id="add" onClick={() => this.props.display(form())}>+</button></div>
        {[...state.pending.entries()].map((pair, index) => (
          <div class="pending" key={pair[0]} style={{width: width - 4, left: width * index + 2, background: radial(pair[1].props.bgcolor), color: pair[1].props.textcolor}} onClick={() => this.props.display(pair[1])}>
            <div class="pending-text" style={{width: width - 50}}>{pair[1].props.label}</div>
            <button class="pending-cancel" onClick={(event) => {event.stopPropagation(); const pending = new Map(state.pending); pending.delete(pair[0]); this.props.setState({pending: pending});}}>✖</button>
          </div>))}
      </div>); // pair[0] = key, pair[1] = object; forceUpdate onresize (tasks & pending); expand tasks
  }
}
function Form(props) {
  const [confirm, setConfirm] = React.useState(false);
  return (
    <div class="form">
      <div class="form-header" style={{background: `radial-gradient(at 25% 75%, ${bright(props.bgcolor)}, ${props.bgcolor})`}}>
        <input type="text" class="form-label" name="label" value={props.label} placeholder="Label" style={{color: props.textcolor}} onChange={props.onChange}/>
        <input type="color" class="form-color" name="bgcolor" value={props.bgcolor} style={{left: 560}} onChange={props.onChange}/>
        <input type="color" class="form-color" name="textcolor" value={props.textcolor} style={{left: 620}} onChange={props.onChange}/>
        <button class="form-cancel" onClick={() => setConfirm(true)}>✖</button>
      </div>
      <div class="form-body">
        <textarea class="form-description" name="description" value={props.description} placeholder="Description" onChange={props.onChange}/>
        <div class="form-tag-container">
          {[...props.tags.entries()].map((pair) => (
            <div class="form-tag" key={pair[0]} style={{background: props.selectTags.has(pair[0]) ? "#000000" : pair[1].props.bgcolor, color: props.selectTags.has(pair[0]) ? "#FFFFFF" : pair[1].props.textcolor}} onClick={() => props.changeTags(pair[0])}>
              {pair[1].props.label}
            </div>
          ))}
        </div>
        Schedules<button onClick={props.scheduleAdd}>+</button>
        <div class="">
          {props.schedules.map((schedule, index) => (
            <div key={schedule.key}>
              <input type="datetime-local" name="from" value={schedule.from} onChange={(event) => props.scheduleChange(index, event)}/>
              <input type="datetime-local" name="to" value={schedule.to} onChange={(event) => props.scheduleChange(index, event)}/>
              Year<input type="number" name="year" value={schedule.year} min="0" onChange={(event) => props.scheduleChange(index, event)}/>
              Month<input type="number" name="month" value={schedule.month} min="0" onChange={(event) => props.scheduleChange(index, event)}/>
              Week<input type="number" name="week" value={schedule.week} min="0" onChange={(event) => props.scheduleChange(index, event)}/>
              Day<input type="number" name="day" value={schedule.day} min="0" onChange={(event) => props.scheduleChange(index, event)}/>
              Hour<input type="number" name="hour" value={schedule.hour} min="0" onChange={(event) => props.scheduleChange(index, event)}/>
              Minute<input type="number" name="minute" value={schedule.minute} min="0" onChange={(event) => props.scheduleChange(index, event)}/>
              <button onClick={() => props.scheduleDelete(index)}>-</button>
            </div>
          ))}
        </div>
        Reminders<button onClick={props.reminderAdd}>+</button>
        <div class="">
          {props.reminders.map((reminder, index) => (
            <div key={reminder.key}>
              <input type="datetime-local" name="start" value={reminder.start} onChange={(event) => props.reminderChange(index, event)}/>
              Year<input type="number" name="year" value={reminder.year} min="0" onChange={(event) => props.reminderChange(index, event)}/>
              Month<input type="number" name="month" value={reminder.month} min="0" onChange={(event) => props.reminderChange(index, event)}/>
              Week<input type="number" name="week" value={reminder.week} min="0" onChange={(event) => props.reminderChange(index, event)}/>
              Day<input type="number" name="day" value={reminder.day} min="0" onChange={(event) => props.reminderChange(index, event)}/>
              Hour<input type="number" name="hour" value={reminder.hour} min="0" onChange={(event) => props.reminderChange(index, event)}/>
              Minute<input type="number" name="minute" value={reminder.minute} min="0" onChange={(event) => props.reminderChange(index, event)}/>
              <button onClick={() => props.reminderDelete(index)}>-</button>
            </div>
          ))}
        </div>
        Links<button onClick={props.linkAdd}>+</button>
        <div class="link-container">
          {props.links.map((link, index) => (
            <div key={link.key}>
              <input type="text" name="label" value={link.label} onChange={(event) => props.linkChange(index, event)}/>
              <input type="text" name="address" value={link.address} onChange={(event) => props.linkChange(index, event)}/>
              <button onClick={() => props.linkDelete(index)}>-</button>
            </div>
          ))}
        </div>
        <input type="range" name="priority" value={props.priority} onChange={props.onChange}/>{props.priority}
        <button class="" onClick={props.submit}>Submit</button>
      </div>
      <div id="dark-2" class={confirm ? "dim" : "bright"}></div>
      {confirm && (
        <div class="form-confirm">
          Delete?
          <button onClick={props.cancel}>Yes</button>
          <button onClick={() => setConfirm(false)}>No</button>
        </div>)}
    </div>);
}
function Tag(props) {
  return (
    <div class="tag" style={{background: props.bgcolor}}>
      <input type="text" name="label" value={props.label} onChange={props.onChange}/>
      <input type="color" name="bgcolor" value={props.bgcolor} onChange={props.onChange}/>
      <input type="color" name="textcolor" value={props.textcolor} onChange={props.onChange}/>
      <button onClick={props.submit}>Submit</button>
    </div>
  );
}
function Timer(props) {
  const [count, setCount] = React.useState(0);
  const [reset, setReset] = React.useState(false);
  const start = calculateStart(props);
  function alarm() {
    const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-tick-tock-clock-timer-1045.mp3");
    audio.volume = 0.2;
    audio.play();
    setTimeout(() => audio.pause(), 5000);
    setCount(count + 1);
  }
  React.useEffect(() => {
    const timer = start > 2147483647 ? setTimeout(() => setReset(!reset), 2147483647) : setTimeout(alarm, start);
    return () => clearTimeout(timer);
  });
  return null;
}
ReactDOM.render(<Page/>, document.body.appendChild(document.createElement("div", {id: "app"})));

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<Page />, document.body.appendChild(document.createElement("div", {id: "app"})));
});