const _cookbook_content = `<p><em>Document is Work in Progress.</em></p> <h1>Philosophy</h1> <h2>On Task Scheduling</h2> <p><em>Task Scheduling</em> may be a term often associated with operating systems, but its principles deeply resonate with human productivity. Let's delve into the nuances:</p> <ol> <li><p><strong>The Illusion of Multitasking</strong>: At its core, task scheduling in computing environments, especially for single-core CPUs, is about creating the illusion of multiple processes running seamlessly in parallel. Humans, just like these CPUs, thrive under the illusion of multitasking.</p></li> <li><p><strong>Throughput vs. Latency</strong>: <em>Throughput</em> signifies the number of tasks or actions completed over a sustained duration. It's about quantity and efficiency. <em>Latency</em>, on the other hand, focuses on consistency. It's about ensuring tasks are completed within their designated time frames.</p></li> </ol> <p>TaskCentral implements an algorithm inspired by those used in operating system to recommend the best possible task for users to work on next:</p> <ol> <li><p><strong>Providing the shortest list possible</strong>: Looking at a long list of tasks reduces clarity and increases useless cognitive demands. Users specify an optional <strong>earliest</strong> date that a task may be worked on and an <strong>until</strong> date for the latest date that a task remains relevant. Users may also choose to <strong>snooze</strong> a task until later. The <em>Filter</em> button under each tab controls what tasks are to be displayed. In the <em>Home</em> tab, the button on the left of the <em>Filter</em> button (usually says "Ready") allows users to change the <em>modeset</em> of the listing, which changes both the filter and the sorting algorithm.</p></li> <li><p>Users specify the <strong>weight</strong> of each task. This tells the system the relative <em>volume of work</em> that must be put in to reach completion.</p></li> <li><p>Users specify the <strong>priority</strong> of each task. This is the <em>importance</em> value - the relative penalty of missing the deadline.</p></li> <li><p>After completing some work, users can update the <strong>progress</strong> of each task. To maximize concurrency, task ordering depreciates exponentially as progress increases.  As a task nears completion, the depreciation reverses direction. This ensures tasks don't become obsolete as they near completion but still retain a degree of urgency to push them to the finish line.</p></li> </ol> <h2>Time Tracking — A Guided Approach</h2> <p>The essence of time tracking in TaskCentral isn't just about analytical insights; it's a compass guiding your focus.</p> <p>The ultimate goal is to achieve maximum throughput without compromising on latency. But, it's a tricky balance:</p> <ol> <li><p><strong>The Cost of Context Switching</strong>: Constantly shifting between tasks can drain us, much like how it impacts system resources. Distractions such as emails and texts also negatively impact productivity. It's beneficial to immerse in one task for extended periods.</p></li> <li><p><strong>Addressing Time-Critical Processes</strong>: However, certain tasks demand timely attention. For instance, while your computer juggles between updating the cursor and running a heavy Excel calculation, you might need to check your emails amidst a busy day. These tasks define the Minimal Allowable Frequency.</p></li> <li><p><strong>Maximizing Focus</strong>: The aim is to extend our focus on a single task as much as possible. Yet, it's limited by two factors: (1) The frequency demanded by time-sensitive tasks and (2) The Maximum Continuous Concentration Time — after which the cost of mental fatigue surpasses the price of shifting tasks.</p></li> </ol> <p>The Maximum Continuous Concentration Time and the minimum frequency for time-sensitive tasks are implemented in TaskCentral via the Pomodoro timer feature. Users can tune the exact minutes in the <em>User</em> tab. After starting a task, click the middle button on the timer screen to start the Pomodoro countdown. The web page will beep when time is up (make sure your volume is turned on).</p> <p>By having a fullscreen timer ticking in front of you, there is psychological pressure applied to encourage staying on-focus as well as completing the task as soon as possible.</p> <p>Wondering what percentage of each project you have spent in the past three months? Or you need to convert the total hours into billable wages? Head to the <em>Metrics</em> tab and have a look at the <em>Data Series</em> dropdown. If you're a power user, you may go to the <em>User</em> tab and export time-tracking data as ledg timeclock files.</p>`;

function ui_menu_select_cookbook() {
  $('.cookbook > .content').html(_cookbook_content);
}
