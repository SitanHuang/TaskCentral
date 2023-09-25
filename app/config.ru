require 'sinatra'
require 'sequel'
require 'json'
require 'tilt/erb'

require 'rufus/scheduler'

$CRON_SCHEDULER = Rufus::Scheduler.new

alias :original_map :map
def map path, controller
  eval(
  "module UrlHelper
  def #{controller.name.sub('Controller', '').downcase}_path child=''
  path = File.join '#{path}', child
  return path.sub(/(.)\\/$/, '\\1')
  end
  end
  "
  )
  original_map path do
    run controller
  end
end

Dir.chdir("#{File.dirname __FILE__}") do
  # pull in the helpers and controllers and models
  (Dir.glob('./helpers/*.rb') +
  ['./controllers/ApplicationController.rb'] +
  Dir.glob('./models/*.rb') +
  Dir.glob('./controllers/*.rb') +
  Dir.glob('./cron/**/*.rb')).each do |file|
    require file
  end
end

eval(File.read("#{File.dirname __FILE__}/routes.rb"))
