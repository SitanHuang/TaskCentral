<!--
This document is used for generating the Cookbook section of the TaskCentral UI.
-->
*Document is Work in Progress.*

# Getting Started

## Download as Mobile Apps
TaskCentral was designed to be cross-platform. For example, on Android Chrome,
you can access TaskCentral, click the top right button, and click *Add to Home Screen*.
All UI elements are designed to work smoothly with mobile user interactions.

## Create Projects
In the *Home* tab, clicking on the *Add Task...* text input will reveal a
button to add projects. Projects are like tags but with the added benefit of
allowing a hierarchical structure. Filtering allows pattern matching that
recognizes the "." character as a delimiter of hierarchy. For example:

1. Filtering "school.\*" matches:

  a. school.lecture

  b. school.mse1500.hw

  c. school.mse1500.class project.meetings

  d. abc school 123.def

2. Filtering "school\*" matches all of the above plus:

  a. school

  b. school 123

3. Filtering ".hw\*" matches:

  a. school.mse1500.hw

  b. school.cs1100.hw.123

  c. work.hardware.123

These are helpful since you can change the filtering using the *Filter* button.
You can then *Save* the filter so that they appear as shortcuts on every tab.

## Importing Tasks
If you already have a Gantt chart from your project manager, or syllabus from
a college course, batch importing all tasks for the next few months may be a good idea. There are two ways to do this:

#### Method 1
Use the *Import* tab and download the template Excel template. If your data
source already contains tables, just copy-paste and clean up the formatting.
You can also use Excel formulas to easily set-up recurring tasks.

#### Method 2
If you know coding, you can copy-paste your data source to ChatGPT (paid
version is recommended) and tell it to generate the following javascript code
for each task:

```js
task_set(task_new({name: 'Name', priority: 5, weight: 5, project: 'Project', earliest: new Date('MM/DD/YYYY').getTime(), due: new Date('MM/DD/YYYY').getTime(), }))
```

The resulting code can then be pasted into the developer web console.

**Important**: This method requires you manually creating the corresponding *project* before executing.

# Philosophy

## On Task Scheduling

*Task Scheduling* may be a term often associated with operating systems, but
its principles deeply resonate with human productivity:

1. **The Illusion of Multitasking**: At its core, task scheduling in computing
   environments, especially for single-core CPUs, is about creating the
   illusion of multiple processes running seamlessly in parallel. Humans, just
   like these CPUs, can really only work on one task at a time.

2. **Throughput vs. Latency**: *Throughput* signifies the number of tasks or
   actions completed over a sustained duration. It's about quantity and
   efficiency. *Latency*, on the other hand, focuses on consistency. It's about
   ensuring tasks are completed within their designated time frames.

TaskCentral implements an algorithm inspired by those used in operating system
to recommend the best possible task for users to work on next:

1. **Providing the shortest list possible**: Looking at a long list of tasks
   reduces clarity and increases useless cognitive demands. Users specify an
   optional **earliest** date that a task may be worked on and an **until**
   date for the latest date that a task remains relevant. Users may also choose
   to **snooze** a task until later. The *Filter* button under each tab
   controls what tasks are to be displayed. In the *Home* tab, the button on
   the left of the *Filter* button (usually says "Ready") allows users to
   change the *modeset* of the listing, which changes both the filter and the
   sorting algorithm.

2. Users specify the **weight** of each task. This tells the system the relative
   *volume of work* that must be put in to reach completion.

3. Users specify the **priority** of each task. This is the *importance* value
   \- the relative penalty of missing the deadline.

4. After completing some work, users can update the **progress** of each task.
   To maximize concurrency, task ordering depreciates exponentially as progress
   increases. As a task nears completion, the depreciation reverses direction.
   This ensures tasks don't become obsolete as they near completion but still
   retain a degree of urgency to push them to the finish line.

## On Time Tracking
The time tracking in TaskCentral isn't just about analytical insights; it's a
compass guiding your focus.

The ultimate goal is to achieve maximum throughput without compromising on
latency. But, it's a tricky balance:

1. **The Cost of Context Switching**: Constantly shifting between tasks can
   drain us, much like how it impacts system resources. Distractions such as
   emails and texts also negatively impact productivity. It's beneficial to
   immerse in one task for extended periods.

2. **Addressing Time-Critical Processes**: However, certain tasks demand timely
   attention. For instance, while your computer juggles between updating the
   cursor and running a heavy Excel calculation, you might need to check your
   emails amidst a busy day. These tasks define the Minimal Allowable
   Frequency.

3. **Maximizing Focus**: The aim is to extend our focus on a single task as
   much as possible. Yet, it's limited by two factors: (1) The frequency
   demanded by time-sensitive tasks and (2) The Maximum Continuous
   Concentration Time — after which the cost of mental fatigue surpasses the
   price of shifting tasks.

The Maximum Continuous Concentration Time and the minimum frequency for
time-sensitive tasks are implemented in TaskCentral via the Pomodoro timer
feature. Users can tune the exact minutes in the *User* tab. After starting a
task, click the middle button on the timer screen to start the Pomodoro
countdown. The web page will beep when time is up (make sure your volume is
turned on).

By having a fullscreen timer ticking in front of you, there is psychological
pressure applied to encourage staying on-focus as well as completing the task
as soon as possible.

Wondering what percentage of each project you have spent in the past three
months? Or you need to convert the total hours into billable wages? Head to the
*Metrics* tab and have a look at the *Data Series* dropdown. If you're a power
user, you may go to the *User* tab and export time-tracking data as ledg
timeclock files.
