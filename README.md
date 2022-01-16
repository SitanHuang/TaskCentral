# Features
- auto-sorting of tasks based on a custom algorithm that involves priority,
  current progress, weight, due date, and earliest possible date to work on
- time-tracking of time spent on each task
- gantt chart
- calendar chart
- export to [ledg](https://github.com/SitanHuang/ledg) timeclock files

## Limitations
- single user only
- requires server & client to send the ENTIRE data file on every action (which
  is still pretty fast)

# Installation

## Step 1

```
bundle install
```

## Step 2

Edit `credentials.hash` in project root:

```
{
  username: '####',
  password: '####'
}
```

## Step 3

```
bundle exec ruby server.rb
```

Then go to [localhost:3001](http://localhost:3001)
