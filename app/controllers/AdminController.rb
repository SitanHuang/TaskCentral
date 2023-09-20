require 'json'

class AdminController < ApplicationController
  # mapped '/admin'
  configure do
    enable :sessions
    set :public_folder, "#{settings.root}/public/admin"
  end

  before do
    authenticate!(99)
  end

  # asset paths may not work correctly without the "/"
  get '' do
    redirect to('/')
  end

  get '/' do
    send_file "#{settings.root}/views/admin/index.html"
  end

  get '/client/*' do |filepath|
    send_file File.join("#{settings.root}/public/client", filepath)
  end

  post '/userStats' do
    QUERY_LIMIT = 100 # users

    data = []

    User.where{last_updated > 0}.order(Sequel.desc(:last_updated)).limit(100).each do |user|
      begin
        target_path = "#{settings.root}/res/storage/#{user.data_path}"

        udat = JSON.parse(File.read(target_path))

        exp = {
          settings: udat["settings"],
          comp: udat["comp"],
          last_updated: user.last_updated,
          last_visited: user.last_visited,
          quota: user.quota,
          size: File.size(target_path)
        }

        if udat["started"]
          task = udat["tasks"][udat["started"]]
          exp["started"] = task
        end

        data << { user: user.username, data: exp }
      rescue StandardError => e
        puts "An error occurred: #{user.username} #{e.message}"
      end
    end

    data.to_json
  end

end
