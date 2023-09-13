require 'json'

class ClientController < ApplicationController
  # mapped '/client'
  configure do
    enable :sessions
    set :public_folder, "#{settings.root}/public/client"
  end

  use Rack::Auth::Basic, "Restricted Area" do |username, password|
    User[username: username, password: password]
  end

  get '' do
    redirect to('/')
  end

  get '/' do
    cache_control :public, :must_revalidate, :max_age => 120 # seconds
    send_file "#{settings.root}/views/client/index.html"
  end

  get '/storage/data' do
    user = request.env["REMOTE_USER"]
    response.headers['Cache-Control'] = 'no-cache'
    session[:user] = User[user]

    FileUtils.mkdir_p("#{settings.root}/res/storage/#{session[:user].data_dir}")

    path = "#{settings.root}/res/storage/#{session[:user].data_path}"

    unless File.exist?(path)
      File.write(path, '{"tasks":{},"projects":{"default":{"color":"#5e5e5e","fontColor":"white","lastUsed":1642952690858,"number":0}},"tags":{},"filters":{}}')
    end

    send_file path
  end

  post '/user/info' do
    user = request.env["REMOTE_USER"]
    user = session[:user] = session[:user] || User[user]

    data_path = "#{settings.root}/res/storage/#{session[:user].data_path}"

    {
      name: user.username,
      create: user.create,
      status: user.status,
      quota: user.quota,
      size: File.exist?(data_path) ? File.size(data_path) : 0
    }.to_json
  end

  post '/mtime' do
    user = request.env["REMOTE_USER"]
    session[:user] = session[:user] || User[user]

    session[:user].update(last_visited: Time.now.to_i * 1000)

    (File.mtime("#{settings.root}/res/storage/#{session[:user].data_path}").to_f*1000).round.to_s
  end

  post '/overwrite' do
    unless params[:file] && params[:file][:tempfile]
      halt 400, 'No file detected.'
    end
    tempfile = params[:file][:tempfile]
    user = request.env["REMOTE_USER"]
    session[:user] = session[:user] || User[user]

    session[:user].update(last_updated: Time.now.to_i * 1000)

    target_path = "#{settings.root}/res/storage/#{session[:user].data_path}"

    quota = session[:user].quota
    current_size = tempfile.size

    if current_size > quota
      return "{ \"status\": \"failed\", \"msg\": \"File size #{current_size / 1024} KiB > user quota of #{quota / 1024} KiB\" }"
    end

    FileUtils.cp(tempfile.path, target_path)

    "{ \"status\": \"ok\", \"quota\":  #{quota}, \"size\": #{current_size}}"
  end

end
