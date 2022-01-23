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

	post '/mtime' do
		(File.mtime("#{settings.root}/res/storage/#{session[:user].data_path}").to_f*1000).round.to_s
	end
	
	post '/overwrite' do
		unless params[:file] && params[:file][:tempfile]
			halt 400, 'No file detected.'
		end
		tempfile = params[:file][:tempfile]
		FileUtils.cp(tempfile.path, "#{settings.root}/res/storage/#{session[:user].data_path}")
	end
	
end