import { spawn } from 'child_process'

export class MLDatasource {
  private static mlDataSource: any

  public static getInstance(): MLDatasource {
    if (!MLDatasource.mlDataSource)
      MLDatasource.mlDataSource = new MLDatasource()
    return MLDatasource.mlDataSource
  }

  public async execCommandAsync(commandName: string, commandArgs: Array<string>, onData: Function, onError: Function) {
    console.log(commandName, commandArgs)
    return new Promise((resolve, reject) => {
      const ls = spawn(commandName, commandArgs);
      ls.stdout.on('data', function() {
        onData(...arguments)
      });
      ls.stderr.on('data', function () {
        onError(...arguments)
        resolve(...arguments)
      });
      ls.on('close', resolve);
    })
  }
}