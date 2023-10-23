//
//  JuiceboxSdk.swift
//  JuiceboxDemo
//
//  Created by Nora Trapp on 10/16/23.
//

import Foundation
import CloudKit
import React

@objc(SecretIdStorage)
class SecretIdStorage: NSObject {
  enum AccountError: Error {
    case notRegistered
    case parentalRestriction
    case noRecord
  }

  let container = CKContainer.default()

  static let secretId = "SecretId"
  let secretIdRecordId = CKRecord.ID(recordName: secretId)

  @objc
  func register(
    _ secretId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      let record = CKRecord(recordType: Self.secretId, recordID: secretIdRecordId)
      record.setObject(secretId as NSString, forKey: Self.secretId)

      do {
        try await checkAccountStatus()
        try await container.privateCloudDatabase.save(record)
        resolve(())
      } catch {
        reject("\((error as NSError).code)", "Failed to save record: \(error)", error)
      }
    }
  }

  @objc
  func recover(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        try await checkAccountStatus()
        let record = try await container.privateCloudDatabase.record(for: secretIdRecordId)
        guard let secretId = record.object(forKey: Self.secretId) as? String else {
          throw AccountError.noRecord
        }
        resolve(secretId)
      } catch {
        reject("\((error as NSError).code)", "Failed to fetch record: \(error)", error)
      }
    }
  }

  func checkAccountStatus() async throws {
    switch try await container.accountStatus() {
    case .couldNotDetermine, .noAccount, .temporarilyUnavailable:
      throw AccountError.notRegistered
    case .available:
      return
    case .restricted:
      throw AccountError.parentalRestriction
    @unknown default:
      throw AccountError.notRegistered
    }
  }
}
