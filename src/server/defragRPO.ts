import Utils, { ServersConfig } from "../utils";
import { languageClient } from "../extension";
import * as vscode from "vscode";
import { ResponseError } from "vscode-languageclient";
import { _debugEvent } from "../debug";

export function defragRpo() {
  const server = ServersConfig.getCurrentServer();

  if (server) {
    if (_debugEvent) {
      vscode.window.showWarningMessage(
        "This operation is not allowed during a debug."
      );
      return;
    }

    let packPatchInfo = false;
    let authorizationToken: string = "";
    var confirmCleanHistory = false;
    if (Utils.isServerP20OrGreater(server)) {
      authorizationToken = ServersConfig.getAuthorizationToken(server);
      if (authorizationToken.length > 0) {
        confirmCleanHistory = true;
      }
    } else {
      packPatchInfo = true; // LG 19 e anteriores
    }
    var first = vscode.l10n.t("Yes"); // Confirmacao de defrag (sempre com limpeza do histórico - LG 19 e anteriores)
    var second = undefined;
    if (confirmCleanHistory) {
      first = vscode.l10n.t("Yes and clear history"); // Confirmacao de defrag com limpeza do histórico
      second = vscode.l10n.t("Yes but keep history"); // Confirmacao de defrag sem limpeza do histórico
    }
    vscode.window
      .showWarningMessage(
        vscode.l10n.t("Are you sure you want to defrag the RPO? (This process may take some time)"),
        { modal: true },
        first,
        second
      )
      .then((clicked) => {
        if (clicked) {
          if (clicked === vscode.l10n.t("Yes")) {
            // até a LG 19 e anteriores, efetuar sempre a remoção do log de aplicação de patch
            // pois o RPO guardava uma "cópia" do patch aplicado fazendo com que o RPO aumentasse muito de tamanho
            execDefragRpo(server.token, "", server.environment, packPatchInfo);
            // Ou é um Harpia, mas não possui token de compilação, então não precisa limpar o histórico
          } else {
            if (clicked === vscode.l10n.t("Yes and clear history")) {
              packPatchInfo = true;
            }
            execDefragRpo(server.token, authorizationToken, server.environment, packPatchInfo);
          }
        }
      });
  } else {
    vscode.window.showErrorMessage(
      vscode.l10n.t("There is no server connected")
    );
  }
}

function execDefragRpo(connectionToken, authorizationToken, environment, packPatchInfo) {
  const exec: Thenable<any> = languageClient
    .sendRequest("$totvsserver/defragRpo", {
      defragRpoInfo: {
        connectionToken: connectionToken,
        authorizationToken: authorizationToken,
        environment: environment,
        packPatchInfo: packPatchInfo,
      },
    })
    .then(
      (response: any) => {
        // Nothing to do
      },
      (err: ResponseError<object>) => {
        vscode.window.showErrorMessage(err.message);
      }
    );
  vscode.window.setStatusBarMessage(
    `$(gear~spin) ${vscode.l10n.t("Defragmenting RPO (process may take some time)")}`,
    exec
  );
}