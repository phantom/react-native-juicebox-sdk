import JuiceboxSdk

@objc(RNJuiceboxSdk)
class RNJuiceboxSdk: NSObject {
    enum ArgumentError: Error {
        case invalidRealmId
        case invalidSecretId
        case invalidConfiguration
    }

    @objc
    func register(
        _ configurationJson: String,
        authentication authenticationJson: [String: String],
        pin: [UInt8],
        secret: [UInt8],
        info: [UInt8],
        numGuesses: Int32,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let authentication: [RealmId: AuthToken]
        do {
            authentication = try self.authentication(authenticationJson)
        } catch {
            return reject("\(error)", "invalid authentication object", error)
        }

        let client = Client(
            configuration: .init(json: configurationJson),
            authTokens: authentication
        )
        Task(priority: .userInitiated) {
            do {
                try await client.register(pin: Data(pin), secret: Data(secret), info: Data(info), guesses: UInt16(numGuesses))
                resolve(())
            } catch {
                return reject("\(error)", "registration failed: \(error)", error)
            }
        }
    }

    @objc
    func recover(
        _ configurationJson: String,
        authentication authenticationJson: [String: String],
        pin: [UInt8],
        info: [UInt8],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let authentication: [RealmId: AuthToken]
        do {
            authentication = try self.authentication(authenticationJson)
        } catch {
            return reject("\(error)", "invalid authentication object", error)
        }

        let client = Client(
            configuration: .init(json: configurationJson),
            authTokens: authentication
        )
        Task(priority: .userInitiated) {
            do {
                let secret = try await client.recover(pin: Data(pin), info: Data(info))
                resolve([UInt8](secret))
            } catch {
                return reject("\(error)", "recover failed: \(error)", error)
            }
        }
    }

    @objc
    func delete(
        _ configurationJson: String,
        authentication authenticationJson: [String: String],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let authentication: [RealmId: AuthToken]
        do {
            authentication = try self.authentication(authenticationJson)
        } catch {
            return reject("\(error)", "invalid authentication object", error)
        }

        let client = Client(
            configuration: .init(json: configurationJson),
            authTokens: authentication
        )
        Task(priority: .userInitiated) {
            do {
                try await client.delete()
                resolve(())
            } catch {
                return reject("\(error)", "delete failed: \(error)", error)
            }
        }
    }

    @objc
    func createAuthentication(
        _ realmIds: [String],
        signingParameters: String,
        secretId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let realmIds = try? realmIds.map({
            guard
                let realmId = RealmId(string: $0)
            else {
                throw ArgumentError.invalidRealmId
            }
            return realmId
        }) else {
            return reject("invalidConfiguration", "invalid configuration object", ArgumentError.invalidConfiguration)
        }

        let generator = AuthTokenGenerator(json: signingParameters)

        guard let secretId = SecretId(string: secretId) else {
            return reject("invalidSecretId", "invalid user id", ArgumentError.invalidSecretId)
        }

        Task(priority: .userInitiated) {
            var authentication = [String: String]()
            for realmId in realmIds {
                authentication[realmId.string] = await generator.vend(realmId: realmId, secretId: secretId).string()
            }
            resolve(authentication)
        }
    }

    @objc
    func randomSecretId(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(SecretId.random().string)
    }

    private func authentication(_ authentication: [String: String]) throws -> [RealmId: AuthToken] {
        let keysWithValues = try authentication.map { key, value in
            guard let realmId = RealmId(string: key) else { throw ArgumentError.invalidRealmId }
            return (realmId, AuthToken(jwt: value))
        }
        return Dictionary(uniqueKeysWithValues: keysWithValues)
    }
}
