require 'open3'
require 'shellwords'

def cron_backup_res
  current_file_folder = File.dirname(__FILE__)
  src = "#{current_file_folder}/../res"
  dst = "#{current_file_folder}/../res.swp"

  credentials_path = File.expand_path('../../db.credentials', __FILE__)
  credentials = JSON.parse(File.read(credentials_path))

  escaped_username = Shellwords.escape(credentials['username'])
  escaped_password = Shellwords.escape(credentials['password'])

  dump_command = "mariadb-dump -u #{escaped_username} --password=#{escaped_password} --databases taskcentral | gzip -9 > res/mariadb_dump.sql"

  rsync_exists = system("command -v rsync >/dev/null 2>&1")

  if rsync_exists
    command = "rsync -a #{src}/ #{dst}/"
  else
    command = "cp -r #{src}/ #{dst}/"
  end

  puts Time.now
  puts "CRON JOB: Running #{dump_command}"

  system(dump_command)

  puts Time.now
  puts "CRON JOB: Running #{command}"

  stdout, stderr, status = Open3.capture3(command)

  if status.success?
    puts "Copy successful."
  else
    puts "Error: #{stderr}"
  end
end

# Backup res to res.swp every 2 AM PDT (4 AM CDT)
$CRON_SCHEDULER.cron "0 2 * * *" do
  cron_backup_res
end

cron_backup_res
