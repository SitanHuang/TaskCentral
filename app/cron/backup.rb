require 'open3'

# Backup res to res.swp every 2 AM PDT (4 AM CDT)
$CRON_SCHEDULER.cron "0 2 * * *" do
  current_file_folder = File.dirname(__FILE__)
  src = "#{current_file_folder}/../res"
  dst = "#{current_file_folder}/../res.swp"

  rsync_exists = system("command -v rsync >/dev/null 2>&1")

  if rsync_exists
    command = "rsync -a #{src}/ #{dst}/"
  else
    command = "cp -r #{src}/ #{dst}/"
  end

  puts Time.now
  puts "CRON JOB: Running #{command}"

  stdout, stderr, status = Open3.capture3(command)

  if status.success?
    puts "Copy successful."
  else
    puts "Error: #{stderr}"
  end
end

